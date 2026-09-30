const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const WebSocket = require('ws');

const databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sghi-auth-api-'));
process.env.DB_DIR = databaseDirectory;
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@example.test';
process.env.BOOTSTRAP_ADMIN_PASSWORD = 'admin-password-123';
process.env.FRONTEND_ORIGINS = 'http://localhost:5500,http://127.0.0.1:5500';

const { startServer } = require('../server');
const db = require('../src/database');

function cookieFrom(response) {
  return response.headers.get('set-cookie').split(';')[0];
}

async function request(baseUrl, route, { method = 'GET', cookie, body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.Cookie = cookie;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000)
  });
  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

function connectWebSocket(url, cookie, origin) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (origin) headers.Origin = origin;
    const socket = new WebSocket(url, { headers });
    const firstMessage = new Promise((resolveMessage) => {
      socket.once('message', (data) => resolveMessage(JSON.parse(data.toString())));
    });
    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error('WebSocket handshake timed out'));
    }, 5000);
    socket.once('open', () => {
      clearTimeout(timeout);
      resolve({ socket, firstMessage });
    });
    socket.once('unexpected-response', (_request, response) => {
      clearTimeout(timeout);
      response.resume();
      reject(new Error(`WebSocket handshake returned ${response.statusCode}`));
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

test('protects REST and WebSocket endpoints with role-based access', async (context) => {
  const server = await startServer({ port: 0, startMqtt: false });
  const baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
  context.after(async () => {
    await server.close();
    await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  assert.equal((await request(baseUrl, '/')).response.status, 200);
  const preflight = await request(baseUrl, '/auth/me', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:5500',
      'Access-Control-Request-Method': 'GET'
    }
  });
  assert.equal(preflight.response.status, 204);
  assert.equal(preflight.response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5500');
  assert.equal(preflight.response.headers.get('access-control-allow-credentials'), 'true');

  const sessionCheck = await request(baseUrl, '/auth/me', {
    headers: { Origin: 'http://127.0.0.1:5500' }
  });
  assert.equal(sessionCheck.response.status, 401);
  assert.equal(sessionCheck.response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5500');
  assert.equal(sessionCheck.response.headers.get('access-control-allow-credentials'), 'true');
  assert.equal((await request(baseUrl, '/leituras')).response.status, 401);
  assert.equal((await request(baseUrl, '/usuarios')).response.status, 401);
  assert.equal((await request(baseUrl, '/auth/login', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example' },
    body: { email: 'admin@example.test', senha: 'admin-password-123' }
  })).response.status, 403);

  const badLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.test', senha: 'incorrect-password' }
  });
  assert.equal(badLogin.response.status, 401);

  const adminLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.test', senha: 'admin-password-123' }
  });
  assert.equal(adminLogin.response.status, 200);
  assert.match(adminLogin.response.headers.get('set-cookie'), /HttpOnly/);
  const adminCookie = cookieFrom(adminLogin.response);
  const adminId = adminLogin.payload.usuario.id;

  const viewerResult = await request(baseUrl, '/usuarios', {
    method: 'POST', cookie: adminCookie,
    body: { nome: 'Consulta', email: 'consulta@example.test', senha: 'viewer-password-123', papel: 'consulta' }
  });
  assert.equal(viewerResult.response.status, 201);
  const operatorResult = await request(baseUrl, '/usuarios', {
    method: 'POST', cookie: adminCookie,
    body: { nome: 'Operador', email: 'operador@example.test', senha: 'operator-password-123', papel: 'operador' }
  });
  assert.equal(operatorResult.response.status, 201);
  const usersList = await request(baseUrl, '/usuarios', { cookie: adminCookie });
  assert.equal(usersList.response.status, 200);
  assert.equal(usersList.payload.length, 3);
  const viewerLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email: 'consulta@example.test', senha: 'viewer-password-123' }
  });
  const viewerCookie = cookieFrom(viewerLogin.response);

  assert.equal((await request(baseUrl, '/leituras', { cookie: viewerCookie })).response.status, 200);
  assert.equal((await request(baseUrl, '/usuarios', { cookie: viewerCookie })).response.status, 403);
  assert.equal((await request(baseUrl, '/config/thresholds/ESP32_Irrigacao_Gabriel', {
    method: 'PUT', cookie: viewerCookie,
    body: { pumpOnAtOrBelow: 100, pumpOffAtOrAbove: 110 }
  })).response.status, 403);
  assert.equal((await request(baseUrl, '/leituras', {
    method: 'POST', cookie: viewerCookie,
    body: { deviceID: 'test', propriedade: 'umidade', valor: 42, timestamp: new Date().toISOString() }
  })).response.status, 403);

  const viewerUpdate = await request(baseUrl, `/usuarios/${viewerResult.payload.id}`, {
    method: 'PUT', cookie: adminCookie,
    body: { nome: 'Consulta atualizada' }
  });
  assert.equal(viewerUpdate.response.status, 200);
  assert.equal(viewerUpdate.payload.nome, 'Consulta atualizada');

  const operatorLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email: 'operador@example.test', senha: 'operator-password-123' }
  });
  const operatorCookie = cookieFrom(operatorLogin.response);
  assert.equal((await request(baseUrl, '/config/thresholds/ESP32_Irrigacao_Gabriel', {
    method: 'PUT', cookie: operatorCookie,
    body: { pumpOnAtOrBelow: 100, pumpOffAtOrAbove: 110 }
  })).response.status, 200);
  assert.equal((await request(baseUrl, '/usuarios', { cookie: operatorCookie })).response.status, 403);

  const lastAdmin = await request(baseUrl, `/usuarios/${adminId}`, {
    method: 'DELETE', cookie: adminCookie
  });
  assert.equal(lastAdmin.response.status, 409);

  const passwordReset = await request(baseUrl, `/usuarios/${operatorResult.payload.id}`, {
    method: 'PUT', cookie: adminCookie,
    body: { senha: 'operator-password-456' }
  });
  assert.equal(passwordReset.response.status, 200);
  assert.equal((await request(baseUrl, '/auth/me', { cookie: operatorCookie })).response.status, 401);

  await assert.rejects(connectWebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws`), /handshake returned 401/);
  await assert.rejects(
    connectWebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws`, adminCookie, 'https://attacker.example'),
    /handshake returned 403/
  );
  const { socket, firstMessage } = await connectWebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws`, adminCookie);
  const message = await firstMessage;
  assert.equal(message.type, 'connection.status');
  socket.close();

  const deactivation = await request(baseUrl, `/usuarios/${viewerResult.payload.id}`, {
    method: 'DELETE', cookie: adminCookie
  });
  assert.equal(deactivation.response.status, 200);
  assert.equal((await request(baseUrl, '/auth/me', { cookie: viewerCookie })).response.status, 401);

  assert.equal((await request(baseUrl, '/auth/logout', {
    method: 'POST', cookie: adminCookie
  })).response.status, 204);
  assert.equal((await request(baseUrl, '/auth/me', { cookie: adminCookie })).response.status, 401);
});