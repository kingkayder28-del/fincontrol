import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincontrol-stale-snapshot-'));
process.env.PORT = String(4310 + Math.floor(Math.random() * 200));
process.env.HOST = '127.0.0.1';
process.env.DATA_DIR = dataDir;
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

const { app } = await import('../server.js');
const server = app.listen(Number(process.env.PORT), '127.0.0.1');
const baseUrl = `http://127.0.0.1:${process.env.PORT}`;

try {
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', reject);
  });

  const passwordHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('StrongPassword123!'))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');

  const user = {
    id: 'u-stale',
    orgId: 'org-stale',
    name: 'Stale Admin',
    email: 'stale@example.com',
    role: 'admin',
    passwordHash,
    mfaEnabled: false,
    status: 'active'
  };

  const bootstrap = await fetch(`${baseUrl}/api/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  assert.equal(bootstrap.status, 200);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'StrongPassword123!' })
  });
  assert.equal(login.status, 200);
  const { session } = await login.json() as { session: { token: string } };
  const authHeaders = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };

  const staleSeed = {
    organizations: [{ id: 'org-stale', name: 'Stale Org', currency: { code: 'MWK', symbol: 'MWK', name: 'Malawian Kwacha' } }],
    activeOrgId: 'org-stale',
    users: [{ ...user, passwordHash }],
    currentUser: user,
    accounts: [],
    categories: [],
    receipts: [],
    payments: [],
    transfers: [],
    cashCounts: [],
    reconciliations: [],
    shareLinks: [],
    auditLogs: [],
    notifications: [],
    recoveryCodes: {}
  };

  const staleResponse = await fetch(`${baseUrl}/api/store`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(staleSeed)
  });
  assert.equal(staleResponse.status, 410);

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);

  console.log('stale snapshot regression test passed');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
