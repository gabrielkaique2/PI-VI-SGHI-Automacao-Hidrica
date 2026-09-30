const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolveDatabasePath } = require('../src/database/databasePath');

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sghi-db-path-'));
}

test('migrates sensores.db when dbm.db does not exist', (context) => {
  const directory = createTemporaryDirectory();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const legacyPath = path.join(directory, 'sensores.db');
  fs.writeFileSync(legacyPath, 'legacy database');

  const databasePath = resolveDatabasePath(directory);

  assert.equal(databasePath, path.join(directory, 'dbm.db'));
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'legacy database');
  assert.equal(fs.existsSync(legacyPath), false);
});

test('uses dbm.db and preserves sensores.db when both files exist', (context) => {
  const directory = createTemporaryDirectory();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, 'dbm.db');
  const legacyPath = path.join(directory, 'sensores.db');
  fs.writeFileSync(databasePath, 'current database');
  fs.writeFileSync(legacyPath, 'legacy database');

  assert.equal(resolveDatabasePath(directory), databasePath);
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'current database');
  assert.equal(fs.readFileSync(legacyPath, 'utf8'), 'legacy database');
});