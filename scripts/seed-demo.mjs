import fs from 'node:fs';
import path from 'node:path';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo data seeding is disabled in production.');
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const source = path.join(process.cwd(), 'data', 'fincontrol-backup-pre-admin-reset.json');
const target = path.join(dataDir, 'fincontrol-backup.json');
fs.mkdirSync(dataDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Demo data seeded to ${target}`);