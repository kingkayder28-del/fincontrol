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

const { createRecoveryKeyForUser, getCurrentSession, resetUserPasswordWithRecovery } = await import('../src/lib/auth.ts');

const users: User[] = [{
  id: 'u1',
  orgId: 'o1',
  name: 'Test Admin',
  email: 'admin@example.com',
  role: 'admin',
  mfaEnabled: false,
  status: 'active',
  passwordHash: undefined
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

const backupData = JSON.parse(memory.get('fincontrol_recovery_admin@example.com') ?? '{}');
const phraseReset = await resetUserPasswordWithRecovery(
  'admin@example.com',
  'AnotherPass123!',
  '',
  users,
  backupData.recoveryPhrase
);
assert.ok(phraseReset);
assert.equal(users[0].passwordHash, phraseReset.passwordHash);

const emergencyUsers: User[] = [{
  id: 'u2',
  orgId: 'o1',
  name: 'Fallback Admin',
  email: 'fallback@example.com',
  role: 'admin',
  mfaEnabled: false,
  status: 'active',
  passwordHash: undefined
}];

const emergencyReset = await import('../src/lib/auth.ts').then(({ resetAdminPassword }) =>
  resetAdminPassword('wrong-email@example.com', 'EmergencyPass123!', emergencyUsers)
);
assert.ok(emergencyReset);
assert.equal(emergencyReset.id, 'u2');
assert.ok(emergencyUsers[0].passwordHash);

const snapshot = {
  activeOrgId: 'org-1',
  currentUser: {
    id: 'usr-1',
    orgId: 'org-1',
    name: 'Recovered Admin',
    email: 'recovered@example.com',
    role: 'admin',
    mfaEnabled: false,
    status: 'active'
  },
  users: [{
    id: 'usr-1',
    orgId: 'org-1',
    name: 'Recovered Admin',
    email: 'recovered@example.com',
    role: 'admin',
    mfaEnabled: false,
    status: 'active'
  }]
};

memory.set('fincontrol_pro_data_v2', JSON.stringify(snapshot));
memory.set('fincontrol_auth_session', '');

const recoveredSession = getCurrentSession();
assert.ok(recoveredSession);
assert.equal(recoveredSession.userEmail, 'recovered@example.com');
assert.equal(recoveredSession.orgId, 'org-1');

console.log('password recovery test passed');
