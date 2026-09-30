const db = require('../database');

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parameters, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

function insert({ deviceID, propriedade, valor, statusBomba, timestamp }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO leituras (device_id, propriedade, valor, statusBomba, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [deviceID, propriedade, valor, statusBomba, timestamp],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

module.exports = {
  all: () => all('SELECT * FROM leituras ORDER BY timestamp DESC'),
  byDevice: (deviceID) => all(
    'SELECT * FROM leituras WHERE device_id = ? ORDER BY timestamp DESC',
    [deviceID]
  ),
  insert
};