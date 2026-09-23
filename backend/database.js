const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./sensores.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err.message);
  } else {
    console.log('Banco SQLite conectado.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      propriedade REAL NOT NULL,
      valor REAL NOT NULL,
      statusBomba TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela:', err.message);
    } else {
      console.log('Tabela "leituras" pronta.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      device_id TEXT PRIMARY KEY,
      pump_on_at_or_below INTEGER NOT NULL CHECK (pump_on_at_or_below BETWEEN 0 AND 409),
      pump_off_at_or_above INTEGER NOT NULL CHECK (pump_off_at_or_above BETWEEN 0 AND 409),
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela de configurações:', err.message);
      return;
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS configuracoes_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        pump_on_at_or_below INTEGER NOT NULL CHECK (pump_on_at_or_below BETWEEN 0 AND 409),
        pump_off_at_or_above INTEGER NOT NULL CHECK (pump_off_at_or_above BETWEEN 0 AND 409),
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )
    `, (historyError) => {
      if (historyError) {
        console.error('Erro ao criar tabela de histórico de configurações:', historyError.message);
        return;
      }

      db.run(`
        INSERT INTO configuracoes_historico
          (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
        SELECT device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at
        FROM configuracoes
        WHERE NOT EXISTS (
          SELECT 1 FROM configuracoes_historico h
          WHERE h.device_id = configuracoes.device_id
            AND h.version = configuracoes.version
        )
      `, (migrationError) => {
        if (migrationError) {
          console.error('Erro ao migrar histórico de configurações:', migrationError.message);
        }
      });

      db.run(`
        INSERT INTO configuracoes
          (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
        VALUES (?, 102, 103, 1, ?)
        ON CONFLICT(device_id) DO NOTHING
      `, ['ESP32_Irrigacao_Gabriel', new Date().toISOString()], (seedError) => {
        if (seedError) console.error('Erro ao inserir configuração padrão:', seedError.message);
      });
    });
  });
});

module.exports = db;