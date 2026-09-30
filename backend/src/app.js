const express = require('express');
const { allowedOrigins } = require('./config/security');
const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const readingRoutes = require('./routes/readingRoutes');
const userRoutes = require('./routes/userRoutes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ erro: 'Origem não autorizada.' });
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  app.get('/', (_req, res) => {
    res.json({
      sistema: 'Sistema de Gestão Hídrica Inteligente (SGHI)',
      status: 'Online',
      timestamp: new Date()
    });
  });
  app.use('/auth', authRoutes);
  app.use('/leituras', readingRoutes);
  app.use('/config', configRoutes);
  app.use('/usuarios', userRoutes);

  app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error('Erro na API:', error.message);
    res.status(statusCode).json({ erro: statusCode >= 500 ? 'Erro interno do servidor.' : error.message });
  });

  return app;
}

module.exports = { createApp };