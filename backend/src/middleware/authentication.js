const authService = require('../services/authService');
const { SESSION_COOKIE, parseCookies } = require('../config/security');

function authenticate(req, res, next) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return res.status(401).json({ erro: 'Autenticação necessária.' });

  authService.verifyToken(token).then((user) => {
    if (!user) return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    req.user = user;
    next();
  }).catch(next);
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.papel)) {
      return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRoles };