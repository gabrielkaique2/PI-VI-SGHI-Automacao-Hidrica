const express = require('express');
const http = require('http');
const db = require('./database');
const LeituraMapper = require('./DTO/leituraMapper');
const configService = require('./configService');
const { createRealtimeServer } = require('./realtime');
require('./mqttClient'); // inicia o MQTT automaticamente

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const PORT = 3000;
const MQTT_TOPIC = 'sensor/umidade';

/**
 * ROTA RAIZ
 * Status do sistema
 */
app.get('/', (req, res) => {
  res.json({
    sistema: "Sistema de Gestão Hídrica Inteligente (SGHI)",
    status: "Online",
    timestamp: new Date()
  });
});

/**
 * Buscar todas as leituras
 */
app.get('/leituras', (req, res) => {
  db.all(
    `SELECT * FROM leituras ORDER BY timestamp DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      const dtos = (rows || []).map(r => LeituraMapper.toDTO(r));
      res.json(dtos);
    }
  );
});

/**
 * Buscar leituras por dispositivo
 */
app.get('/leituras/:deviceID', (req, res) => {
  const { deviceID } = req.params;

  db.all(
    `SELECT * FROM leituras 
     WHERE device_id = ? 
     ORDER BY timestamp DESC`,
    [deviceID],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }
      res.json((rows || []).map(r => LeituraMapper.toDTO(r)));
    }
  );
});

/**
 * Inserção manual (opcional para testes via Postman)
 */
app.post('/leituras', (req, res) => {
  const { deviceID, propriedade, valor, statusBomba = 'desligado', timestamp } = req.body;

  if (!deviceID || !propriedade || valor === undefined || !timestamp) {
    return res.status(400).json({
      erro: "Campos obrigatórios: deviceID, propriedade, valor, timestamp"
    });
  }

  db.run(
    `INSERT INTO leituras (device_id, propriedade, valor, statusBomba, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [deviceID, propriedade, valor, statusBomba, timestamp],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        mensagem: "Leitura inserida com sucesso",
        id: this.lastID
      });
    }
  );
});

app.get('/config/thresholds/:deviceID', async (req, res) => {
  try {
    const config = await configService.get(req.params.deviceID);
    if (!config) return res.status(404).json({ erro: 'Configuração não encontrada.' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/config/thresholds/:deviceID', async (req, res) => {
  try {
    const config = await configService.update(req.params.deviceID, req.body);
    if (app.locals.realtime) app.locals.realtime.broadcast('thresholds.updated', config);
    res.json(config);
  } catch (err) {
    res.status(err.statusCode || 500).json({ erro: err.message });
  }
});

/**
 * Rota não encontrada
 */
app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada"
  });
});

/**
 * Inicialização do servidor
 */
const httpServer = http.createServer(app);
const realtime = createRealtimeServer(httpServer);
app.locals.realtime = realtime;
process.on('sghi:reading', (reading) => realtime.broadcast('reading.created', reading));
process.on('sghi:device-status', (status) => realtime.broadcast('device.status', status));

httpServer.listen(PORT, () => {
  console.log(`SGHI rodando em http://localhost:${PORT}`);
  console.log(`📡 Aguardando dados no tópico MQTT: ${MQTT_TOPIC}`);
});

module.exports = { app, httpServer, realtime };