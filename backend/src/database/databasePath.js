const fs = require('node:fs');
const path = require('node:path');

function resolveDatabasePath(directory) {
  const databaseDirectory = path.resolve(directory);
  const databasePath = path.join(databaseDirectory, 'dbm.db');
  const legacyPath = path.join(databaseDirectory, 'sensores.db');

  if (!fs.existsSync(databasePath) && fs.existsSync(legacyPath)) {
    fs.renameSync(legacyPath, databasePath);
  }

  return databasePath;
}

module.exports = { resolveDatabasePath };