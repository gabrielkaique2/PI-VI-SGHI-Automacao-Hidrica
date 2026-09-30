const WebSocket = require('ws');
const { SESSION_COOKIE, allowedOrigins, parseCookies } = require('../config/security');

function createRealtimeServer(server, authenticate) {
  const websocketServer = new WebSocket.Server({
    server,
    path: '/ws',
    verifyClient(info, done) {
      if (info.origin && !allowedOrigins.has(info.origin)) {
        return done(false, 403, 'Origem não autorizada.');
      }
      const token = parseCookies(info.req.headers.cookie)[SESSION_COOKIE];
      Promise.resolve(authenticate(token)).then((user) => {
        if (!user) return done(false, 401, 'Autenticação necessária.');
        info.req.sghiUser = user;
        done(true);
      }).catch(() => done(false, 401, 'Sessão inválida ou expirada.'));
    }
  });
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

  return { broadcast, websocketServer };
}

module.exports = { createRealtimeServer };