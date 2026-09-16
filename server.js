import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});
const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fincontrol-backup.json');

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

  fs.writeFileSync(DATA_FILE, JSON.stringify(safeStore, null, 2));
  return safeStore;
}

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'FinControl backend is running',
    dataDir: DATA_DIR,
    dataFile: DATA_FILE,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/store', (_req, res) => {
  const store = readStore();
  res.json(store);
});

app.post('/api/store', (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const store = writeStore(incoming);
  res.json({ ok: true, lastSavedAt: store.lastSavedAt, dataFile: DATA_FILE });
});

app.get('/api/export', (_req, res) => {
  const store = readStore();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="fincontrol-backup.json"');
  res.send(JSON.stringify(store, null, 2));
});

app.post('/api/import', (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : null;

  if (!incoming) {
    return res.status(400).json({ ok: false, message: 'Expected a JSON object in the request body.' });
  }

  const store = writeStore(incoming);
  return res.json({ ok: true, lastSavedAt: store.lastSavedAt, message: 'Imported backup successfully.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FinControl backend running on http://0.0.0.0:${PORT}`);
  console.log(`DATA_DIR=${DATA_DIR}`);
  console.log(`DATA_FILE=${DATA_FILE}`);
});
