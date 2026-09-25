const db = require('./database');

const SENSOR_MIN = 0;
const SENSOR_MAX = 409;

function normalizeConfig(row) {
  if (!row) return null;

  return {
    deviceID: String(row.device_id),
    pumpOnAtOrBelow: Number(row.pump_on_at_or_below),
    pumpOffAtOrAbove: Number(row.pump_off_at_or_above),
    version: Number(row.version),
    updatedAt: String(row.updated_at)
  };
}

function validateConfig(input = {}) {
  const on = Number(input.pumpOnAtOrBelow);
  const off = Number(input.pumpOffAtOrAbove);

  if (!Number.isInteger(on) || !Number.isInteger(off)) {
    return { valid: false, error: 'Os limiares devem ser números inteiros.' };
  }

  if (on < SENSOR_MIN || on > SENSOR_MAX || off < SENSOR_MIN || off > SENSOR_MAX) {
    return { valid: false, error: 'Os limiares devem estar entre 0 e 409.' };
  }

  if (on >= off) {
    return { valid: false, error: 'pumpOnAtOrBelow deve ser menor que pumpOffAtOrAbove.' };
  }

  return { valid: true, values: { on, off } };
}

function get(deviceID) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at
       FROM configuracoes WHERE device_id = ?`,
      [deviceID],
      (err, row) => err ? reject(err) : resolve(normalizeConfig(row))
    );
  });
}

function update(deviceID, input) {
  const validation = validateConfig(input);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    return Promise.reject(error);
  }

  const { on, off } = validation.values;
  const updatedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT version FROM configuracoes WHERE device_id = ?`,
      [deviceID],
      (currentErr, currentRow) => {
        if (currentErr) return reject(currentErr);

        const nextVersion = (currentRow ? Number(currentRow.version) : 0) + 1;

        db.run('BEGIN IMMEDIATE', (beginErr) => {
          if (beginErr) return reject(beginErr);

          db.run(
            `INSERT INTO configuracoes_historico
              (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [deviceID, on, off, nextVersion, updatedAt],
            (historyErr) => {
              if (historyErr) {
                db.run('ROLLBACK', () => reject(historyErr));
                return;
              }

              db.run(
                `INSERT INTO configuracoes
                  (device_id, pump_on_at_or_below, pump_off_at_or_above, version, updated_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(device_id) DO UPDATE SET
                  pump_on_at_or_below = excluded.pump_on_at_or_below,
                  pump_off_at_or_above = excluded.pump_off_at_or_above,
                  version = excluded.version,
                  updated_at = excluded.updated_at`,
                [deviceID, on, off, nextVersion, updatedAt],
                async (saveErr) => {
                  if (saveErr) {
                    db.run('ROLLBACK', () => reject(saveErr));
                    return;
                  }

                  db.run('COMMIT', async (commitErr) => {
                    if (commitErr) {
                      reject(commitErr);
                      return;
                    }

                    try {
                      resolve(await get(deviceID));
                    } catch (readError) {
                      reject(readError);
                    }
                  });
                }
              );
            }
          );
        });
      }
    );
  });
}

function decidePumpState(value, config, currentState = false) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < SENSOR_MIN || numericValue > SENSOR_MAX) {
    throw new Error('O valor bruto deve estar entre 0 e 409.');
  }

  if (numericValue <= config.pumpOnAtOrBelow) return true;
  if (numericValue >= config.pumpOffAtOrAbove) return false;
  return Boolean(currentState);
}

module.exports = {
  SENSOR_MIN,
  SENSOR_MAX,
  get,
  update,
  validateConfig,
  decidePumpState
};
