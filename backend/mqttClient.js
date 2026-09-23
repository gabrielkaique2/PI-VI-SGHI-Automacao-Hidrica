const mqtt = require('mqtt');
const http = require('http');
const https = require('https');
const db = require('./database');
const configService = require('./configService');

const mqttUrl = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
const mqttTopic = process.env.MQTT_TOPIC || 'sensor/umidade';
const simulatorControlUrl = process.env.SIMULATOR_CONTROL_URL;
const pumpStates = new Map();

const client = mqtt.connect(mqttUrl,{
  family: 4,
  reconnectPeriod: 2000,
  connectTimeout: 30_000,
  clientId: 'sghi_backend_' + Math.random().toString(16).slice(2,8),
});

client.on('connect', () => {
  console.log('Conectado ao broker MQTT - SGHI - (IPv4 forced)');
  client.subscribe(mqttTopic, (err, granted) => {
    if (err) {
      console.error('Erro ao se inscrever no tópico MQTT:', err.message);
    } else {
      console.log('Inscrito com sucesso no tópico MQTT:', granted);
    }
  });
});

function sendPumpCommand(payload) {
  if (!simulatorControlUrl) {
    return Promise.resolve({ skipped: true, reason: 'SIMULATOR_CONTROL_URL não configurada' });
  }

  const target = new URL(simulatorControlUrl);
  const transport = target.protocol === 'https:' ? https : http;
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = transport.request(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 3000
    }, (response) => {
      response.resume();
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve({ statusCode: response.statusCode });
      } else {
        reject(new Error(`Simulador respondeu HTTP ${response.statusCode}`));
      }
    });

    request.on('timeout', () => request.destroy(new Error('Timeout ao enviar comando ao simulador')));
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function salvarLeitura(data, comandoBomba, controleStatus) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO leituras (device_id, propriedade, valor, statusBomba, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [data.deviceID, data.propriedade, data.valor, comandoBomba ? 'ligado' : 'desligado', data.timestamp],
      function (err) {
        if (err) return reject(err);
        const leitura = {
          id: this.lastID,
          deviceID: String(data.deviceID),
          propriedade: String(data.propriedade),
          valor: Number(data.valor),
          statusBomba: comandoBomba ? 'ligado' : 'desligado',
          comandoBomba,
          controleStatus,
          timestamp: String(data.timestamp)
        };
        process.emit('sghi:reading', leitura);
        resolve(leitura);
      }
    );
  });
}

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    const { deviceID, propriedade, valor, statusBomba, timestamp } = data;

    console.log('Dado recebido (SGHI):', data);

    if (!deviceID || !propriedade || valor === undefined || !timestamp) {
      console.warn('Dados incompletos recebidos:', data);
      return;
    }

    const numericValue = Number(valor);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 409) {
      console.warn('Valor bruto fora da faixa 0..409:', data);
      return;
    }

    const config = await configService.get(deviceID);
    if (!config) {
      console.warn(`Configuração não encontrada para ${deviceID}`);
      return;
    }

    const currentState = pumpStates.get(deviceID) || false;
    const comandoBomba = configService.decidePumpState(numericValue, config, currentState);
    pumpStates.set(deviceID, comandoBomba);

    let controleStatus = 'pendente';
    try {
      const commandResult = await sendPumpCommand({
        deviceID,
        ligar: comandoBomba,
        valorBruto: numericValue,
        configVersion: config.version
      });
      controleStatus = commandResult.skipped ? 'não enviado' : 'confirmado';
    } catch (commandError) {
      controleStatus = `erro: ${commandError.message}`;
      process.emit('sghi:device-status', {
        deviceID,
        status: 'control-error',
        message: commandError.message,
        timestamp: new Date().toISOString()
      });
    }

    await salvarLeitura({ deviceID, propriedade, valor: numericValue, timestamp }, comandoBomba, controleStatus);

  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

client.on('error', (err) => {
  console.error('Erro MQTT:', err.message);
});

client.on('reconnect', () => console.log('MQTT reconnecting...'));
client.on('offline', () => console.log('MQTT offline'));
client.on('close', () => console.log('MQTT connection closed'));

module.exports = { client, sendPumpCommand, pumpStates };