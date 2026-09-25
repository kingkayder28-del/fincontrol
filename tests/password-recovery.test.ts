import { strict as assert } from 'node:assert';
import type { User } from '../src/types.ts';

// Minimal browser-like storage for tests
const memory = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
  clear: () => memory.clear(),
};

const { createRecoveryKeyForUser, resetUserPasswordWithRecovery } = await import('../src/lib/auth.ts');

const users: User[] = [{
  id: 'u1',
  orgId: 'o1',
  name: 'Test Admin',
  email: 'admin@example.com',
  role: 'admin',
  mfaEnabled: false,
  status: 'active' as const,
}];

const recoveryKey = createRecoveryKeyForUser('admin@example.com');
assert.equal(typeof recoveryKey, 'string');
assert.ok(recoveryKey.length >= 12);

const wrongReset = await resetUserPasswordWithRecovery('admin@example.com', 'NewPass123!', 'wrong-key', users);
assert.equal(wrongReset, null);

const goodReset = await resetUserPasswordWithRecovery('admin@example.com', 'NewPass123!', recoveryKey, users);
assert.ok(goodReset);
assert.equal(goodReset.id, 'u1');
assert.ok(goodReset.passwordHash);
assert.equal(users[0].passwordHash, goodReset.passwordHash);

console.log('password recovery test passed');
