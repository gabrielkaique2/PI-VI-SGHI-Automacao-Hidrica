const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sghi-db-schema-'));
process.env.DB_DIR = directory;
const db = require('../src/database');

test('initializes existing SGHI tables and adds the users schema idempotently', async (context) => {
  context.after(async () => {
    await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(directory, { recursive: true, force: true });
  });

  await db.initializeDatabase();
  await db.initializeDatabase();

  const columns = await new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(usuarios)', (error, rows) => error ? reject(error) : resolve(rows));
  });
  const names = columns.map((column) => column.name);
  assert.ok(names.includes('password_hash'));
  assert.ok(names.includes('token_version'));
  assert.ok(names.includes('papel'));
});