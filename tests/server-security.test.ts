import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = 4300 + Math.floor(Math.random() * 200);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincontrol-security-'));
process.env.PORT = String(port);
process.env.HOST = '127.0.0.1';
process.env.DATA_DIR = dataDir;
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
const { app } = await import('../server.js');
const server = app.listen(port, '127.0.0.1');

const baseUrl = `http://127.0.0.1:${port}`;
try {
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', reject);
  });

  const unauthenticated = await fetch(`${baseUrl}/api/store`);
  assert.equal(unauthenticated.status, 401);

  const deniedCors = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(deniedCors.headers.get('access-control-allow-origin'), null);

  const passwordHash = crypto.createHash('sha256').update('StrongPassword123!').digest('hex');
  const user = { id: 'u1', orgId: 'org1', name: 'Admin', email: 'admin@example.com', role: 'admin', passwordHash, mfaEnabled: false, status: 'active' };
  const bootstrap = await fetch(`${baseUrl}/api/auth/bootstrap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user }) });
  assert.equal(bootstrap.status, 200);
  const staleSnapshot = await fetch(`${baseUrl}/api/store`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer stale-client-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizations: [], users: [], currentUser: {}, recoveryCodes: {} })
  });
  assert.equal(staleSnapshot.status, 401);
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'StrongPassword123!' }) });
  assert.equal(login.status, 200);
  const { session } = await login.json() as { session: { token: string } };
  const authHeaders = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };

  const staleAuthenticatedSnapshot = await fetch(`${baseUrl}/api/store`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ organizations: [], users: [], currentUser: {}, recoveryCodes: {} })
  });
  assert.equal(staleAuthenticatedSnapshot.status, 410);
  const loginAfterStaleSync = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'StrongPassword123!' })
  });
  assert.equal(loginAfterStaleSync.status, 200);

  const created = await fetch(`${baseUrl}/api/resources/accounts`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ id: 'acct1', orgId: 'org1', name: 'Main', type: 'cash' }) });
  assert.equal(created.status, 201);
  const firstUpdate = await fetch(`${baseUrl}/api/resources/accounts/acct1`, { method: 'PATCH', headers: { ...authHeaders, 'If-Match': '1' }, body: JSON.stringify({ name: 'Updated once' }) });
  assert.equal(firstUpdate.status, 200);
  const staleUpdate = await fetch(`${baseUrl}/api/resources/accounts/acct1`, { method: 'PATCH', headers: { ...authHeaders, 'If-Match': '1' }, body: JSON.stringify({ name: 'Stale write' }) });
  assert.equal(staleUpdate.status, 409);
  console.log('server security test passed');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  fs.rmSync(dataDir, { recursive: true, force: true });
}