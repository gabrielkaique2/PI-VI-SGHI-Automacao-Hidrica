const express = require('express');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/authentication');
const { clearSessionCookie, setSessionCookie } = require('../config/security');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body.email, req.body.senha);
    setSessionCookie(res, token);
    res.json({ usuario: user });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ usuario: req.user }));

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
  } catch (error) {
    return next(error);
  }
  clearSessionCookie(res);
  res.status(204).end();
});

module.exports = router;