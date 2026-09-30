const db = require('../database');

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, parameters, (err, row) => err ? reject(err) : resolve(row || null));
  });
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parameters, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function findByEmail(email) {
  return get('SELECT * FROM usuarios WHERE email = ?', [email]);
}

function findById(id) {
  return get('SELECT * FROM usuarios WHERE id = ?', [id]);
}

function countUsers() {
  return get('SELECT COUNT(*) AS count FROM usuarios').then((row) => Number(row.count));
}

function countActiveAdmins() {
  return get("SELECT COUNT(*) AS count FROM usuarios WHERE papel = 'admin' AND ativo = 1")
    .then((row) => Number(row.count));
}

async function create({ nome, email, passwordHash, papel }) {
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO usuarios (nome, email, password_hash, papel, ativo, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [nome, email, passwordHash, papel, now, now]
  );
  return findById(result.lastID);
}

async function update(id, changes) {
  const columns = {
    nome: 'nome',
    email: 'email',
    passwordHash: 'password_hash',
    papel: 'papel',
    ativo: 'ativo',
    tokenVersion: 'token_version'
  };
  const assignments = [];
  const values = [];

  for (const [key, column] of Object.entries(columns)) {
    if (Object.hasOwn(changes, key)) {
      assignments.push(`${column} = ?`);
      values.push(changes[key]);
    }
  }

  assignments.push('updated_at = ?');
  values.push(new Date().toISOString(), id);
  await run(`UPDATE usuarios SET ${assignments.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function list() {
  return all(`SELECT id, nome, email, papel, ativo, created_at, updated_at
              FROM usuarios ORDER BY nome COLLATE NOCASE`);
}

module.exports = {
  countActiveAdmins,
  countUsers,
  create,
  findByEmail,
  findById,
  list,
  update
};