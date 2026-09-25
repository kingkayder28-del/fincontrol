import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincontrol-session-restart-'));
const port = 4320 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not become ready in time.');
}

function startServer() {
  return spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      ALLOWED_ORIGINS: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const user = {
  id: 'u-session',
  orgId: 'org-session',
  name: 'Session User',
  email: 'session@example.com',
  role: 'admin',
  passwordHash: crypto.createHash('sha256').update('SessionsLive123!').digest('hex'),
  mfaEnabled: false,
  status: 'active'
};

const firstServer = startServer();
try {
  await waitForServer();

  const bootstrap = await fetch(`${baseUrl}/api/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  assert.equal(bootstrap.status, 200, await bootstrap.text());

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'SessionsLive123!' })
  });
  const loginText = await login.text();
  assert.equal(login.status, 200, loginText);
  const parsedLogin = JSON.parse(loginText) as { session?: { token: string } };
  const session = parsedLogin.session;
  assert.ok(session?.token, 'Expected a session token from the login response.');

  firstServer.kill('SIGTERM');
  await new Promise(resolve => firstServer.once('exit', resolve));

  const restartedServer = startServer();
  try {
    await waitForServer();

    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const body = await me.json();
    assert.equal(me.status, 200, JSON.stringify(body));
    assert.equal(body.user.email, user.email);
    console.log('session restart test passed');
  } finally {
    restartedServer.kill('SIGTERM');
    await new Promise(resolve => restartedServer.once('exit', resolve));
  }
} finally {
  if (!firstServer.killed) {
    firstServer.kill('SIGTERM');
    await new Promise(resolve => firstServer.once('exit', resolve));
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
}
