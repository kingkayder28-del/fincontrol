import { strict as assert } from 'node:assert';

type StoreShape = {
  organizations: any[];
  activeOrgId: string;
  currentUser: any;
  users: any[];
  accounts: any[];
  categories: any[];
  inventory: any[];
  inventoryImportApprovals: any[];
  inventoryMovements: any[];
  projects: any[];
  departments: any[];
  receipts: any[];
  payments: any[];
  transfers: any[];
  cashCounts: any[];
  reconciliations: any[];
  shareLinks: any[];
  auditLogs: any[];
  notifications: any[];
};

const memory = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
  clear: () => memory.clear(),
};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
  clear: () => memory.clear(),
};

const store: StoreShape = {
  organizations: [{
    id: 'org-test-1',
    name: 'Test Org',
    type: 'Business',
    country: 'Malawi',
    currency: { code: 'MWK', symbol: 'MWK', name: 'Malawian Kwacha' },
    fiscalYearStart: '01-01',
    status: 'active',
    approvalThreshold: 1000000,
    createdAt: new Date().toISOString()
  }],
  activeOrgId: 'org-test-1',
  currentUser: { id: 'u1', orgId: 'org-test-1', name: 'Admin', email: 'a@example.com', role: 'admin', mfaEnabled: false, status: 'active' },
  users: [],
  accounts: [{
    id: 'acct-bank-1',
    orgId: 'org-test-1',
    name: 'Main Bank',
    type: 'bank',
    accountNoIdentifier: '001',
    currency: 'MWK',
    openingBalance: 0,
    currentBalance: 0,
    status: 'active'
  }],
  categories: [],
  inventory: [],
  inventoryImportApprovals: [],
  inventoryMovements: [],
  projects: [],
  departments: [],
  receipts: [{
    id: 'rcpt-1',
    orgId: 'org-test-1',
    receiptNumber: 'RCPT-1',
    date: '2026-08-12',
    time: '09:00',
    receivedFrom: 'Airtel user',
    description: 'Airtel top up',
    categoryId: '',
    accountId: 'acct-bank-1',
    paymentMethod: 'mobile_money',
    amount: 450000,
    recordedByUserId: 'u1',
    recordedByName: 'Admin',
    createdAt: new Date().toISOString()
  }],
  payments: [{
    id: 'pay-1',
    orgId: 'org-test-1',
    paymentNumber: 'PAY-1',
    date: '2026-08-12',
    time: '10:00',
    payee: 'Supplier',
    description: 'Mobile money payment',
    categoryId: '',
    accountId: 'acct-bank-1',
    paymentMethod: 'mobile_money',
    amount: 120000,
    recordedByUserId: 'u1',
    recordedByName: 'Admin',
    status: 'paid',
    createdAt: new Date().toISOString()
  }],
  transfers: [],
  cashCounts: [],
  reconciliations: [],
  shareLinks: [],
  auditLogs: [],
  notifications: []
};

memory.set('fincontrol_pro_data_v2', JSON.stringify(store));

const { calculateFinancialSummary } = await import('../src/lib/storage.ts');

const summary = calculateFinancialSummary('org-test-1');
assert.equal(summary.totalMobileMoneyBalance, 330000, 'mobile-money transactions should count even when stored under a non-mobile-money account');
console.log('mobile money summary test passed');
