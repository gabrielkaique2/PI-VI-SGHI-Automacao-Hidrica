const bcrypt = require('bcryptjs');
const usersRepository = require('../repositories/usersRepository');
const { toPublicUser } = require('./authService');

const ROLES = new Set(['admin', 'operador', 'consulta']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function validateName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    fail('Informe um nome com até 100 caracteres.');
  }
  return name.trim();
}

function validateEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    fail('Informe um email válido.');
  }
  return email.trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    fail('A senha deve ter entre 12 e 128 caracteres.');
  }
}

function validateRole(role) {
  if (!ROLES.has(role)) fail('Papel inválido. Use admin, operador ou consulta.');
}

function handleRepositoryError(error) {
  if (error && error.code === 'SQLITE_CONSTRAINT' && error.message.includes('usuarios.email')) {
    fail('Já existe um usuário com esse email.', 409);
  }
  throw error;
}

async function create(input = {}) {
  const nome = validateName(input.nome);
  const email = validateEmail(input.email);
  validatePassword(input.senha);
  const papel = input.papel || 'consulta';
  validateRole(papel);
  const passwordHash = await bcrypt.hash(input.senha, 12);

  try {
    return toPublicUser(await usersRepository.create({ nome, email, passwordHash, papel }));
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function update(id, input = {}) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) fail('Identificador de usuário inválido.');
  const current = await usersRepository.findById(numericId);
  if (!current) fail('Usuário não encontrado.', 404);

  const changes = {};
  if (Object.hasOwn(input, 'nome')) changes.nome = validateName(input.nome);
  if (Object.hasOwn(input, 'email')) changes.email = validateEmail(input.email);
  if (Object.hasOwn(input, 'papel')) {
    validateRole(input.papel);
    changes.papel = input.papel;
  }
  if (Object.hasOwn(input, 'ativo')) {
    if (typeof input.ativo !== 'boolean') fail('O campo ativo deve ser booleano.');
    changes.ativo = input.ativo ? 1 : 0;
  }
  if (Object.hasOwn(input, 'senha')) {
    validatePassword(input.senha);
    changes.passwordHash = await bcrypt.hash(input.senha, 12);
    changes.tokenVersion = Number(current.token_version || 0) + 1;
  }
  if (!Object.keys(changes).length) fail('Nenhuma alteração informada.');

  const nextRole = changes.papel || current.papel;
  const nextActive = Object.hasOwn(changes, 'ativo') ? Boolean(changes.ativo) : Boolean(current.ativo);
  if (current.papel === 'admin' && current.ativo && (nextRole !== 'admin' || !nextActive)) {
    if (await usersRepository.countActiveAdmins() <= 1) {
      fail('Não é possível desativar ou rebaixar o último administrador ativo.', 409);
    }
  }

  try {
    return toPublicUser(await usersRepository.update(numericId, changes));
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function deactivate(id) {
  return update(id, { ativo: false });
}

async function list() {
  return (await usersRepository.list()).map(toPublicUser);
}

module.exports = { create, deactivate, list, update };