const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolveDatabasePath } = require('../src/database/databasePath');

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sghi-db-path-'));
}

test('uses dbm.db even when a legacy sensores.db file exists', (context) => {
  const directory = createTemporaryDirectory();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, 'dbm.db');
  const legacyPath = path.join(directory, 'sensores.db');
  fs.writeFileSync(legacyPath, 'legacy database');

  assert.equal(resolveDatabasePath(directory), databasePath);
  assert.equal(fs.existsSync(databasePath), false);
  assert.equal(fs.readFileSync(legacyPath, 'utf8'), 'legacy database');
});