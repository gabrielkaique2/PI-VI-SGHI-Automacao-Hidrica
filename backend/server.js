const http = require('node:http');
const db = require('./src/database');
const { createApp } = require('./src/app');
const authService = require('./src/services/authService');
const { createRealtimeServer } = require('./src/integrations/realtime');

async function startServer({ port = Number(process.env.PORT || 3000), startMqtt = true } = {}) {
  await db.initializeDatabase();
  await authService.createBootstrapAdmin();

  const app = createApp();
  const httpServer = http.createServer(app);
  const realtime = createRealtimeServer(httpServer, authService.verifyToken);
  app.locals.realtime = realtime;

  const onReading = (reading) => realtime.broadcast('reading.created', reading);
  const onDeviceStatus = (status) => realtime.broadcast('device.status', status);
  process.on('sghi:reading', onReading);
  process.on('sghi:device-status', onDeviceStatus);

  const mqttIntegration = startMqtt ? require('./src/integrations/mqttClient') : null;

  try {
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, resolve);
    });
  } catch (error) {
    process.off('sghi:reading', onReading);
    process.off('sghi:device-status', onDeviceStatus);
    if (mqttIntegration) mqttIntegration.client.end(true);
    throw error;
  }

  const address = httpServer.address();
  console.log(`SGHI rodando em http://localhost:${address.port}`);
  if (mqttIntegration) {
    console.log(`Aguardando dados no tópico MQTT: ${process.env.MQTT_TOPIC || 'sensor/umidade'}`);
  }

  async function close() {
    process.off('sghi:reading', onReading);
    process.off('sghi:device-status', onDeviceStatus);

    if (mqttIntegration) {
      await new Promise((resolve) => mqttIntegration.client.end(true, {}, resolve));
    }

    for (const socket of realtime.websocketServer.clients) socket.terminate();
    await new Promise((resolve) => realtime.websocketServer.close(resolve));
    if (httpServer.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
    }
  }

  return { app, close, httpServer, realtime };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Falha ao iniciar o backend:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { startServer };