const express = require('express');
const configService = require('../services/configService');
const { authenticate, requireRoles } = require('../middleware/authentication');

const router = express.Router();
router.use(authenticate);

router.get('/thresholds/:deviceID', async (req, res, next) => {
  try {
    const config = await configService.get(req.params.deviceID);
    if (!config) return res.status(404).json({ erro: 'Configuração não encontrada.' });
    res.json(config);
  } catch (error) {
    next(error);
  }
});

router.put('/thresholds/:deviceID', requireRoles('admin', 'operador'), async (req, res, next) => {
  try {
    const config = await configService.update(req.params.deviceID, req.body);
    if (req.app.locals.realtime) req.app.locals.realtime.broadcast('thresholds.updated', config);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

module.exports = router;