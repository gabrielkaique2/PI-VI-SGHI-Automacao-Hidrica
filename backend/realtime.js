const WebSocket = require('ws');

function createRealtimeServer(server) {
  const websocketServer = new WebSocket.Server({ server, path: '/ws' });
  const clients = new Set();

  websocketServer.on('connection', (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({
      type: 'connection.status',
      payload: { status: 'connected', timestamp: new Date().toISOString() }
    }));

    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
  });

  function broadcast(type, payload) {
    const message = JSON.stringify({ type, payload });
    for (const socket of clients) {
      if (socket.readyState === WebSocket.OPEN) socket.send(message);
    }
  }

  return { broadcast };
}

module.exports = { createRealtimeServer };
