const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { resolveDatabasePath } = require('./databasePath');

const databaseDirectory = process.env.DB_DIR
  ? path.resolve(process.env.DB_DIR)
  : path.resolve(__dirname, '../..');
const databasePath = resolveDatabasePath(databaseDirectory);
const db = new sqlite3.Database(databasePath, (err) => {
  if (err) console.error('Erro ao conectar ao banco:', err.message);
  else console.log(`Banco SQLite conectado: ${databasePath}`);
});

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve());
  });
}

async function initializeDatabase() {
  await exec(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      propriedade REAL NOT NULL,
      valor REAL NOT NULL,
      statusBomba TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      device_id TEXT PRIMARY KEY,
      pump_on_at_or_below INTEGER NOT NULL CHECK (pump_on_at_or_below BETWEEN 0 AND 409),
      pump_off_at_or_above INTEGER NOT NULL CHECK (pump_off_at_or_above BETWEEN 0 AND 409),
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      pump_on_at_or_below INTEGER NOT NULL CHECK (pump_on_at_or_below BETWEEN 0 AND 409),
      pump_off_at_or_above INTEGER NOT NULL CHECK (pump_off_at_or_above BETWEEN 0 AND 409),
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      papel TEXT NOT NULL CHECK (papel IN ('admin', 'operador', 'consulta')),
      ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await run(`
    INSERT INTO configuracoes_historico
      (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
    SELECT device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at
    FROM configuracoes
    WHERE NOT EXISTS (
      SELECT 1 FROM configuracoes_historico h
      WHERE h.device_id = configuracoes.device_id
        AND h.version = configuracoes.version
    )
  `);
  await run(`
    INSERT INTO configuracoes
      (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
    VALUES (?, 102, 103, 1, ?)
    ON CONFLICT(device_id) DO NOTHING
  `, ['ESP32_Irrigacao_Gabriel', new Date().toISOString()]);
}

db.initializeDatabase = initializeDatabase;
db.databasePath = databasePath;

module.exports = db;