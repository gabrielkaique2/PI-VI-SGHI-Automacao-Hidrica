const express = require('express');
const usersService = require('../services/usersService');
const { authenticate, requireRoles } = require('../middleware/authentication');

const router = express.Router();
router.use(authenticate, requireRoles('admin'));

router.get('/', async (_req, res, next) => {
  try {
    res.json(await usersService.list());
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await usersService.create(req.body));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    res.json(await usersService.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    res.json(await usersService.deactivate(req.params.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;