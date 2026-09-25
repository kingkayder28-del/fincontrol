import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
      return res.sendStatus(403);
    }
    return res.sendStatus(204);
  }
  return next();
});
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fincontrol-backup.json');
const SESSION_FILE = path.join(DATA_DIR, 'fincontrol-sessions.json');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SHARE_TOKEN_SECRET = process.env.SHARE_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const scryptAsync = promisify(crypto.scrypt);
const sessions = new Map();
const userSessions = new Map();
const loginAttempts = new Map();
const loginRateLimit = { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 };
const entityCollections = new Set([
  'organizations', 'users', 'accounts', 'categories', 'inventory', 'inventoryImportApprovals',
  'inventoryMovements', 'projects', 'departments', 'receipts', 'payments', 'transfers',
  'cashCounts', 'reconciliations', 'shareLinks', 'auditLogs', 'notifications'
]);

const emptyStore = {
  organizations: [],
  activeOrgId: '',
  currentUser: null,
  users: [],
  accounts: [],
  categories: [],
  inventory: [],
  inventoryImportApprovals: [],
  inventoryMovements: [],
  projects: [],
  departments: [],
  receipts: [],
  payments: [],
  transfers: [],
  cashCounts: [],
  reconciliations: [],
  shareLinks: [],
  auditLogs: [],
  notifications: [],
  recoveryCodes: {},
  lastSavedAt: null,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(emptyStore, null, 2));
  }
}

function readStore() {
  ensureDataDir();

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...emptyStore, ...parsed, lastSavedAt: parsed.lastSavedAt || new Date().toISOString() };
  } catch (error) {
    console.error('Failed to read backup file. Resetting to empty store.', error);
    writeStore(emptyStore);
    return { ...emptyStore };
  }
}

function writeStore(store) {
  ensureDataDir();

  const safeStore = {
    ...emptyStore,
    ...store,
    lastSavedAt: new Date().toISOString(),
  };

  const temporaryFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(safeStore, null, 2), 'utf8');
  fs.renameSync(temporaryFile, DATA_FILE);
  return safeStore;
}

function ensureSessionStore() {
  ensureDataDir();
  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ sessions: {} }, null, 2), 'utf8');
  }
}

function readSessionStore() {
  ensureSessionStore();
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.sessions ? parsed.sessions : {};
  } catch {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ sessions: {} }, null, 2), 'utf8');
    return {};
  }
}

function writeSessionStore(sessionMap) {
  ensureSessionStore();
  const snapshot = { sessions: sessionMap };
  const temporaryFile = `${SESSION_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(snapshot, null, 2), 'utf8');
  fs.renameSync(temporaryFile, SESSION_FILE);
}

function persistSession(token, session) {
  const persisted = readSessionStore();
  persisted[token] = { ...session, token };
  writeSessionStore(persisted);
}

function removePersistedSession(token) {
  const persisted = readSessionStore();
  delete persisted[token];
  writeSessionStore(persisted);
}

function hydrateSessionsFromDisk() {
  sessions.clear();
  userSessions.clear();
  const persisted = readSessionStore();
  const nextPersisted = {};

  for (const [token, session] of Object.entries(persisted)) {
    if (!session || !session.userId || !session.orgId) continue;
    const expiresAt = new Date(session.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      continue;
    }
    if (expiresAt > new Date()) {
      const normalized = { ...session, token, userId: session.userId, orgId: session.orgId, expiresAt: expiresAt.toISOString() };
      sessions.set(token, normalized);
      const sessionSet = userSessions.get(session.userId) || new Set();
      sessionSet.add(token);
      userSessions.set(session.userId, sessionSet);
      nextPersisted[token] = normalized;
    }
  }

  writeSessionStore(nextPersisted);
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${Buffer.from(derivedKey).toString('base64url')}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  if (storedHash.startsWith('scrypt$')) {
    const [, saltText, hashText] = storedHash.split('$');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = Buffer.from(await scryptAsync(password, Buffer.from(saltText, 'base64url'), expected.length));
    return { valid: actual.length === expected.length && crypto.timingSafeEqual(actual, expected), needsUpgrade: false };
  }

  const normalisedHash = storedHash.startsWith('sha256:') ? storedHash.slice('sha256:'.length) : storedHash;
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  const expected = Buffer.from(normalisedHash, 'hex');
  const actual = Buffer.from(legacyHash, 'hex');
  if (expected.length !== actual.length) {
    return { valid: false, needsUpgrade: true };
  }
  return { valid: crypto.timingSafeEqual(actual, expected), needsUpgrade: true };
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session = { userId: user.id, orgId: user.orgId, expiresAt };
  sessions.set(token, session);
  persistSession(token, session);
  const sessionSet = userSessions.get(user.id) || new Set();
  sessionSet.add(token);
  userSessions.set(user.id, sessionSet);
  return { token, expiresAt };
}

function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const remote = req.socket?.remoteAddress || 'unknown';
  return Array.isArray(forwarded) ? forwarded[0] : String(forwarded || remote || 'unknown');
}

function clearLoginAttemptState(key, email) {
  if (key) {
    const keyState = loginAttempts.get(key);
    if (keyState) {
      delete keyState[email];
      if (Object.keys(keyState).length === 0) loginAttempts.delete(key);
    }
  }
}

function recordFailedLogin(req, email) {
  const key = getClientKey(req);
  const state = loginAttempts.get(key) || {};
  const now = Date.now();
  const record = state[email] || { count: 0, firstAttemptAt: now, lockedUntil: 0 };
  record.count += 1;
  record.firstAttemptAt = record.firstAttemptAt || now;
  if (record.count >= loginRateLimit.maxAttempts) {
    record.lockedUntil = now + loginRateLimit.lockoutMs;
  }
  state[email] = record;
  loginAttempts.set(key, state);
  return record;
}

function isLoginBlocked(req, email) {
  const key = getClientKey(req);
  const state = loginAttempts.get(key)?.[email];
  if (!state) return false;
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return true;
  }
  if (state.lockedUntil && state.lockedUntil <= Date.now()) {
    delete loginAttempts.get(key)[email];
    return false;
  }
  return false;
}

function createRecoveryCode() {
  return `FIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function getSession(req) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  const session = sessions.get(token) || readSessionStore()[token] || null;
  if (!session || new Date(session.expiresAt) <= new Date()) {
    if (token) {
      sessions.delete(token);
      removePersistedSession(token);
    }
    return null;
  }
  if (!sessions.has(token)) {
    sessions.set(token, session);
  }
  return { token, ...session };
}

function signSharePayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SHARE_TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readSharePayload(token) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', SHARE_TOKEN_SECRET).update(encoded).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.expiresAt && new Date(payload.expiresAt) > new Date() ? payload : null;
  } catch {
    return null;
  }
}

function getSharedReport(store, share) {
  const organization = store.organizations.find(org => org.id === share.orgId);
  if (!organization) return null;
  return {
    organization,
    reportTitle: share.reportTitle,
    reportType: share.reportType,
    receipts: store.receipts.filter(item => item.orgId === share.orgId),
    payments: store.payments.filter(item => item.orgId === share.orgId),
    cashCounts: store.cashCounts.filter(item => item.orgId === share.orgId),
    auditLogs: store.auditLogs.filter(item => item.orgId === share.orgId)
  };
}

async function authorizeSharedReport(req, res) {
  const payload = readSharePayload(req.params.token);
  if (!payload) return res.status(404).json({ ok: false, message: 'Share link is invalid or expired.' });
  const store = readStore();
  const share = store.shareLinks.find(link => link.id === payload.shareId && !link.isRevoked);
  if (!share) return res.status(404).json({ ok: false, message: 'Share link is invalid or revoked.' });
  if (share.accessHash) {
    const candidate = String(req.body?.passcode || '');
    const actual = crypto.createHash('sha256').update(candidate).digest();
    const expected = Buffer.from(share.accessHash, 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(actual, expected)) {
      return res.status(401).json({ ok: false, requiresPasscode: true, message: 'Passcode required.' });
    }
  }
  return res.json({ ok: true, report: getSharedReport(store, share) });
}

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ ok: false, message: 'Authentication required.' });
  req.session = session;
  return next();
}

function requireUserInSession(req, res) {
  const store = readStore();
  const user = store.users.find(candidate => candidate.id === req.session.userId && candidate.orgId === req.session.orgId);
  if (!user || user.status !== 'active') {
    return null;
  }
  return user;
}

function requireOrgAccess(req, res, next) {
  const user = requireUserInSession(req, res);
  if (!user) {
    return res.status(403).json({ ok: false, message: 'Session user is not active in this organization.' });
  }
  req.user = user;
  return next();
}

function requireOrgAndRole(allowedRoles = []) {
  return (req, res, next) => {
    const user = requireUserInSession(req, res);
    if (!user) {
      return res.status(403).json({ ok: false, message: 'Session user is not active in this organization.' });
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ ok: false, message: 'You do not have permission to perform this action.' });
    }
    req.user = user;
    return next();
  };
}

function requireAdmin(req, res, next) {
  const user = requireUserInSession(req, res);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Administrator access required.' });
  }
  req.user = user;
  return next();
}

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'FinControl backend is running',
    dataDir: DATA_DIR,
    dataFile: DATA_FILE,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/auth/bootstrap', async (req, res) => {
  const incomingUser = req.body?.user;
  const store = readStore();
  if (store.users.length > 0) {
    return res.status(409).json({ ok: false, message: 'Administrator already exists.' });
  }
  if (!incomingUser?.email || !incomingUser?.passwordHash) {
    return res.status(400).json({ ok: false, message: 'A bootstrap administrator is required.' });
  }
  const recoveryCode = createRecoveryCode();
  const recoveryCodes = {
    ...(store.recoveryCodes || {}),
    [normaliseEmail(incomingUser.email)]: {
      hash: crypto.createHash('sha256').update(recoveryCode).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  };
  const saved = writeStore({ ...store, users: [incomingUser], currentUser: incomingUser, recoveryCodes });
  return res.json({ ok: true, user: saved.users[0], recoveryCode });
});

app.get('/api/auth/status', (_req, res) => {
  const store = readStore();
  return res.json({ setupRequired: store.users.length === 0 });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const store = readStore();
  const user = store.users.find(candidate => normaliseEmail(candidate.email) === email);

  if (isLoginBlocked(req, email)) {
    return res.status(429).json({ ok: false, message: 'Too many login attempts. Please wait before trying again.' });
  }

  if (!user || user.status === 'suspended') {
    recordFailedLogin(req, email);
    return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
  }

  const result = await verifyPassword(password, user.passwordHash);
  if (!result.valid) {
    recordFailedLogin(req, email);
    return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
  }
  if (result.needsUpgrade) {
    user.passwordHash = await hashPassword(password);
    writeStore(store);
  }

  clearLoginAttemptState(getClientKey(req), email);
  user.lastLogin = new Date().toISOString();
  const session = createSession(user);
  return res.json({ ok: true, session: { userId: user.id, orgId: user.orgId, userName: user.name, userEmail: user.email, userRole: user.role, ...session, createdAt: new Date().toISOString() }, user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.session.token);
  removePersistedSession(req.session.token);
  const userSessionsForCurrentUser = userSessions.get(req.session.userId);
  if (userSessionsForCurrentUser) {
    userSessionsForCurrentUser.delete(req.session.token);
    if (userSessionsForCurrentUser.size === 0) userSessions.delete(req.session.userId);
  }
  return res.json({ ok: true });
});

app.post('/api/auth/logout-everywhere', requireAuth, (req, res) => {
  const currentSessionTokens = userSessions.get(req.session.userId) || new Set();
  Array.from(currentSessionTokens).forEach(token => {
    sessions.delete(token);
    removePersistedSession(token);
  });
  userSessions.delete(req.session.userId);
  return res.json({ ok: true, message: 'All sessions for this user were invalidated.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  const recoveryCode = String(req.body?.recoveryCode || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  const store = readStore();
  const recovery = store.recoveryCodes?.[email];
  const expectedHash = recovery && crypto.createHash('sha256').update(recoveryCode).digest('hex');
  if (!recovery || expectedHash !== recovery.hash || new Date(recovery.expiresAt) <= new Date()) {
    return res.status(400).json({ ok: false, message: 'Invalid or expired recovery code.' });
  }
  if (newPassword.length < 10) {
    return res.status(400).json({ ok: false, message: 'Use a password with at least 10 characters.' });
  }
  const user = store.users.find(candidate => normaliseEmail(candidate.email) === email && candidate.status !== 'suspended');
  if (!user) return res.status(404).json({ ok: false, message: 'User not found.' });
  user.passwordHash = await hashPassword(newPassword);
  delete store.recoveryCodes[email];
  writeStore(store);
  return res.json({ ok: true, user });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const store = readStore();
  const user = store.users.find(candidate => candidate.id === req.session.userId);
  if (!user) return res.status(401).json({ ok: false, message: 'Session user no longer exists.' });
  return res.json({ ok: true, user, session: req.session });
});

app.post('/api/reports/share', requireAuth, requireOrgAccess, async (req, res) => {
  const { orgId, reportTitle, reportType, expiresAt, passcode } = req.body || {};
  if (!orgId || orgId !== req.session.orgId || !reportTitle || !reportType || !expiresAt) {
    return res.status(400).json({ ok: false, message: 'Invalid share request.' });
  }
  const store = readStore();
  const shareId = `share-${crypto.randomUUID()}`;
  const share = {
    id: shareId,
    orgId,
    reportTitle,
    reportType,
    shareCode: shareId,
    viewOnly: true,
    restrictDownload: true,
    expiresAt,
    createdBy: req.user?.name || req.session.userId,
    createdAt: new Date().toISOString(),
    isRevoked: false,
    ...(passcode ? { accessHash: crypto.createHash('sha256').update(String(passcode)).digest('hex') } : {})
  };
  store.shareLinks.unshift(share);
  writeStore(store);
  const token = signSharePayload({ shareId, orgId, expiresAt });
  return res.json({ ok: true, share: { ...share, passcode: undefined }, token });
});

app.get('/api/shared/:token', authorizeSharedReport);
app.post('/api/shared/:token/access', authorizeSharedReport);

app.get('/api/resources/:collection/:id', requireAuth, requireOrgAccess, (req, res) => {
  const { collection, id } = req.params;
  if (!entityCollections.has(collection)) return res.status(404).json({ ok: false, message: 'Unknown resource.' });
  const store = readStore();
  const record = store[collection]?.find(item => item.id === id && item.orgId === req.session.orgId);
  if (!record) return res.status(404).json({ ok: false, message: 'Resource not found.' });
  return res.json({ ok: true, record: { version: 1, ...record } });
});

app.post('/api/resources/:collection', requireAuth, requireOrgAccess, (req, res) => {
  const { collection } = req.params;
  if (!entityCollections.has(collection)) return res.status(404).json({ ok: false, message: 'Unknown resource.' });
  const incoming = req.body && typeof req.body === 'object' ? { ...req.body } : null;
  if (!incoming?.id || incoming.orgId !== req.session.orgId) {
    return res.status(400).json({ ok: false, message: 'Resource id and organization are required.' });
  }
  const store = readStore();
  if (store[collection].some(item => item.id === incoming.id)) {
    return res.status(409).json({ ok: false, message: 'Resource already exists.' });
  }
  const record = { ...incoming, version: 1, updatedAt: new Date().toISOString() };
  store[collection].push(record);
  writeStore(store);
  return res.status(201).json({ ok: true, record });
});

app.patch('/api/resources/:collection/:id', requireAuth, requireOrgAccess, (req, res) => {
  const { collection, id } = req.params;
  if (!entityCollections.has(collection)) return res.status(404).json({ ok: false, message: 'Unknown resource.' });
  const expectedVersion = Number(req.headers['if-match']);
  if (!Number.isInteger(expectedVersion)) {
    return res.status(428).json({ ok: false, message: 'If-Match record version is required.' });
  }
  const store = readStore();
  const index = store[collection].findIndex(item => item.id === id && item.orgId === req.session.orgId);
  if (index < 0) return res.status(404).json({ ok: false, message: 'Resource not found.' });
  const current = { version: 1, ...store[collection][index] };
  if (current.version !== expectedVersion) {
    return res.status(409).json({ ok: false, message: 'Resource changed since it was read.', record: current });
  }
  const updates = req.body && typeof req.body === 'object' ? req.body : {};
  const record = { ...current, ...updates, id, orgId: current.orgId, version: current.version + 1, updatedAt: new Date().toISOString() };
  store[collection][index] = record;
  writeStore(store);
  return res.json({ ok: true, record });
});

app.get('/api/store', requireAuth, requireOrgAccess, (_req, res) => {
  const store = readStore();
  res.json(store);
});

app.post('/api/store', requireAuth, (_req, res) => {
  return res.status(410).json({
    ok: false,
    message: 'Whole-store sync is disabled. Use the authenticated resource APIs instead of uploading a stale full snapshot.'
  });
});

app.get('/api/export', requireAuth, requireOrgAccess, (_req, res) => {
  const store = readStore();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="fincontrol-backup.json"');
  res.send(JSON.stringify(store, null, 2));
});

app.post('/api/import', requireAuth, requireAdmin, (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : null;

  if (!incoming) {
    return res.status(400).json({ ok: false, message: 'Expected a JSON object in the request body.' });
  }

  const store = writeStore(incoming);
  return res.json({ ok: true, lastSavedAt: store.lastSavedAt, message: 'Imported backup successfully.' });
});

function refuseDemoDataInProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  const store = readStore();
  const hasDemoData = store.organizations.some(org => org.id === 'org-default-01') ||
    store.users.some(user => user.email === 'jbanda@hopehorizon.org');
  if (hasDemoData) {
    throw new Error('Refusing production startup: demo data or default credentials detected.');
  }
}

hydrateSessionsFromDisk();

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refuseDemoDataInProduction();
  app.listen(PORT, HOST, () => {
    console.log(`FinControl backend running on http://${HOST}:${PORT}`);
    console.log(`DATA_DIR=${DATA_DIR}`);
    console.log(`DATA_FILE=${DATA_FILE}`);
    console.log(`SESSION_FILE=${SESSION_FILE}`);
  });
}

export { app };
