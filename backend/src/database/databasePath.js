const path = require('node:path');

function resolveDatabasePath(directory) {
  const databaseDirectory = path.resolve(directory);
  return path.join(databaseDirectory, 'dbm.db');
}

module.exports = { resolveDatabasePath };