const express = require('express');
const LeituraMapper = require('../dto/leituraMapper');
const readingsRepository = require('../repositories/readingsRepository');
const { authenticate, requireRoles } = require('../middleware/authentication');

const router = express.Router();
router.use(authenticate);

async function sendRows(query, res, next) {
  try {
    const rows = await query();
    res.json(rows.map((row) => LeituraMapper.toDTO(row)));
  } catch (error) {
    next(error);
  }
}

router.get('/', (_req, res, next) => sendRows(() => readingsRepository.all(), res, next));
router.get('/:deviceID', (req, res, next) => sendRows(
  () => readingsRepository.byDevice(req.params.deviceID),
  res,
  next
));

router.post('/', requireRoles('admin', 'operador'), async (req, res, next) => {
  const { deviceID, propriedade, valor, statusBomba = 'desligado', timestamp } = req.body;
  if (!deviceID || !propriedade || valor === undefined || !timestamp) {
    return res.status(400).json({ erro: 'Campos obrigatórios: deviceID, propriedade, valor, timestamp' });
  }

  try {
    const id = await readingsRepository.insert({ deviceID, propriedade, valor, statusBomba, timestamp });
    res.status(201).json({ mensagem: 'Leitura inserida com sucesso', id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;