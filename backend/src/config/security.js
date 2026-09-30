const { randomBytes } = require('node:crypto');

const SESSION_COOKIE = 'sghi_session';
const SESSION_SECONDS = 60 * 60;
const jwtSecret = process.env.JWT_SECRET || randomBytes(48).toString('hex');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET deve ser configurado em produção.');
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres em produção.');
}
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGINS) {
  throw new Error('FRONTEND_ORIGINS deve ser configurado em produção.');
}

const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return ['', ''];
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      return [name, decodeURIComponent(value)];
    } catch {
      return [name, ''];
    }
  }).filter(([name]) => name));
}

function setSessionCookie(res, token) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_SECONDS}`
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearSessionCookie(res) {
  const attributes = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

module.exports = {
  SESSION_COOKIE,
  SESSION_SECONDS,
  allowedOrigins,
  clearSessionCookie,
  jwtSecret,
  parseCookies,
  setSessionCookie
};