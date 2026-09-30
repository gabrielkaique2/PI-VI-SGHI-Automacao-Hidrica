const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usersRepository = require('../repositories/usersRepository');
const { SESSION_SECONDS, jwtSecret } = require('../config/security');

const DUMMY_HASH = bcrypt.hashSync('invalid-login-sentinel', 10);

function toPublicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    ativo: Boolean(user.ativo),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

async function login(email, password) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const candidate = typeof password === 'string' ? password : '';
  const user = normalizedEmail ? await usersRepository.findByEmail(normalizedEmail) : null;
  const passwordMatches = await bcrypt.compare(candidate, user ? user.password_hash : DUMMY_HASH);

  if (!user || !user.ativo || !passwordMatches) {
    const error = new Error('Email ou senha inválidos.');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { sub: String(user.id), ver: Number(user.token_version || 0) },
    jwtSecret,
    { expiresIn: SESSION_SECONDS }
  );
  return { token, user: toPublicUser(user) };
}

async function verifyToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await usersRepository.findById(Number(payload.sub));
    if (!user || !user.ativo || Number(user.token_version || 0) !== Number(payload.ver || 0)) return null;
    return toPublicUser(user);
  } catch {
    return null;
  }
}

async function logout(userId) {
  const user = await usersRepository.findById(userId);
  if (user) {
    await usersRepository.update(userId, {
      tokenVersion: Number(user.token_version || 0) + 1
    });
  }
}

async function createBootstrapAdmin() {
  if (await usersRepository.countUsers() > 0) return;

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const nome = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrador';
  if (!email || !password) {
    throw new Error('Configure BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD para criar o primeiro administrador.');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await usersRepository.create({ nome, email, passwordHash, papel: 'admin' });
  console.log(`Administrador inicial criado: ${email}`);
}

module.exports = { createBootstrapAdmin, login, logout, toPublicUser, verifyToken };