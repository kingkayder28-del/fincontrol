import * as XLSX from 'xlsx';

import {
  Organization,
  User,
  Account,
  Category,
  ProjectFund,
  Department,
  Receipt,
  Payment,
  Transfer,
  InventoryItem,
  InventoryImportApproval,
  InventoryMovement,
  DailyCashCount,
  BankReconciliation,
  ReportShareLink,
  AuditLog,
  Notification,
  FinancialSummary,
  CurrencyConfig
} from '../types';

const STORAGE_KEY = 'fincontrol_pro_data_v2';
const SESSION_SNAPSHOT_KEY = 'fincontrol_pro_data_v2_session';

function persistSnapshot(store: AppDataStore) {
  const snapshot = JSON.stringify(store);

  try {
    localStorage.setItem(STORAGE_KEY, snapshot);
    sessionStorage.setItem(SESSION_SNAPSHOT_KEY, snapshot);
  } catch (error) {
    console.error('Failed to persist snapshot to browser storage', error);
  }
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'MWK', symbol: 'MWK', name: 'Malawian Kwacha' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export function formatCurrency(amount: number, currency?: CurrencyConfig | string): string {
  const symbol = typeof currency === 'object' ? currency.symbol : (currency || 'MWK');
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

  return `${symbol} ${formattedNumber}`;
}

// Initial Mock Seed Data
const DEFAULT_ORG: Organization = {
  id: 'org-default-01',
  name: 'Hope Horizon Foundation',
  type: 'NGO',
  registrationNo: 'NGO-MW-2024-88',
  taxId: 'TP-900281-22',
  physicalAddress: 'Plot 14/122 Independence Drive, Capital City',
  postalAddress: 'P.O. Box 30192, Capital City',
  phone: '+265 99 123 4567',
  email: 'finance@hopehorizon.org',
  website: 'https://hopehorizon.org',
  country: 'Malawi',
  currency: { code: 'MWK', symbol: 'MWK', name: 'Malawian Kwacha' },
  fiscalYearStart: '01-01',
  logoUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb0?w=120&auto=format&fit=crop&q=80',
  authorizedSignatory: 'Dr. Evelyn Phiri (Executive Director)',
  contactPerson: 'James Banda (Head of Finance)',
  status: 'active',
  approvalThreshold: 1000000, // 1,000,000 MWK require approval
  themeColor: '#3b82f6', // Blue theme
  accentColor: '#1e40af',
  createdAt: '2026-01-01T08:00:00Z'
};

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-01',
    orgId: 'org-default-01',
    name: 'James Banda',
    email: 'jbanda@hopehorizon.org',
    role: 'admin',
    mfaEnabled: true,
    status: 'active',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'usr-fm-02',
    orgId: 'org-default-01',
    name: 'Sarah Chisale',
    email: 'schisale@hopehorizon.org',
    role: 'finance_manager',
    mfaEnabled: false,
    status: 'active',
    lastLogin: '2026-08-12T14:30:00Z'
  },
  {
    id: 'usr-entry-03',
    orgId: 'org-default-01',
    name: 'Chifundo Mwale',
    email: 'cmwale@hopehorizon.org',
    role: 'data_entry',
    mfaEnabled: false,
    status: 'active',
    lastLogin: '2026-08-13T04:15:00Z'
  },
  {
    id: 'usr-approver-04',
    orgId: 'org-default-01',
    name: 'Dr. Evelyn Phiri',
    email: 'ephiri@hopehorizon.org',
    role: 'approver',
    mfaEnabled: true,
    status: 'active',
    lastLogin: '2026-08-11T09:20:00Z'
  },
  {
    id: 'usr-auditor-05',
    orgId: 'org-default-01',
    name: 'Kondwani Tembo',
    email: 'ktembo@external-audit.com',
    role: 'auditor',
    mfaEnabled: false,
    status: 'active',
    lastLogin: '2026-08-10T16:00:00Z'
  }
];

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acct-cash-01',
    orgId: 'org-default-01',
    name: 'Main Petty Cash Office',
    type: 'cash',
    accountNoIdentifier: '1010-CASH-MAIN',
    currency: 'MWK',
    openingBalance: 250000,
    currentBalance: 485000,
    status: 'active'
  },
  {
    id: 'acct-bank-01',
    orgId: 'org-default-01',
    name: 'Standard Bank Operating Acct',
    type: 'bank',
    accountNoIdentifier: '9182374619283',
    bankOrProviderName: 'Standard Bank',
    currency: 'MWK',
    openingBalance: 45000000,
    currentBalance: 68450000,
    status: 'active'
  },
  {
    id: 'acct-bank-02',
    orgId: 'org-default-01',
    name: 'National Bank Donor Grant Acct',
    type: 'bank',
    accountNoIdentifier: '10029384756',
    bankOrProviderName: 'National Bank of Malawi',
    currency: 'MWK',
    openingBalance: 85000000,
    currentBalance: 112000000,
    status: 'active'
  },
  {
    id: 'acct-mobile-01',
    orgId: 'org-default-01',
    name: 'Airtel Money Merchant Wallet',
    type: 'mobile_money',
    accountNoIdentifier: '+265 99 911 2233',
    bankOrProviderName: 'Airtel Money',
    currency: 'MWK',
    openingBalance: 1200000,
    currentBalance: 3850000,
    status: 'active'
  },
  {
    id: 'acct-mobile-02',
    orgId: 'org-default-01',
    name: 'TNM Mpamba Official Wallet',
    type: 'mobile_money',
    accountNoIdentifier: '+265 88 844 5566',
    bankOrProviderName: 'TNM Mpamba',
    currency: 'MWK',
    openingBalance: 800000,
    currentBalance: 1920000,
    status: 'active'
  }
];

const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-inc-01', orgId: 'org-default-01', name: 'Grant Funding', type: 'income', code: '4010', description: 'Institutional and donor grants', isSystem: true },
  { id: 'cat-inc-02', orgId: 'org-default-01', name: 'Individual Donations', type: 'income', code: '4020', description: 'Public & individual contributions', isSystem: true },
  { id: 'cat-inc-03', orgId: 'org-default-01', name: 'Membership Fees', type: 'income', code: '4030', description: 'Annual membership dues', isSystem: true },
  { id: 'cat-inc-04', orgId: 'org-default-01', name: 'Fundraising Events', type: 'income', code: '4040', description: 'Ticket sales & gala events', isSystem: true },
  { id: 'cat-inc-05', orgId: 'org-default-01', name: 'Consultancy & Service Charges', type: 'income', code: '4050', description: 'Advisory services provided', isSystem: true },

  // Expense
  { id: 'cat-exp-01', orgId: 'org-default-01', name: 'Program & Field Activities', type: 'expense', code: '5010', description: 'Direct project execution costs', isSystem: true },
  { id: 'cat-exp-02', orgId: 'org-default-01', name: 'Salaries & Allowances', type: 'expense', code: '5020', description: 'Staff payroll and field per diems', isSystem: true },
  { id: 'cat-exp-03', orgId: 'org-default-01', name: 'Workshops & Capacity Building', type: 'expense', code: '5030', description: 'Training sessions and seminars', isSystem: true },
  { id: 'cat-exp-04', orgId: 'org-default-01', name: 'Travel & Logistics', type: 'expense', code: '5040', description: 'Fuel, vehicle hire, flights', isSystem: true },
  { id: 'cat-exp-05', orgId: 'org-default-01', name: 'Office Rent & Utilities', type: 'expense', code: '5050', description: 'Rent, electricity, water, internet', isSystem: true },
  { id: 'cat-exp-06', orgId: 'org-default-01', name: 'Bank & Transaction Fees', type: 'expense', code: '5060', description: 'Bank charges, transfer fees, mobile commission', isSystem: true },
  { id: 'cat-exp-07', orgId: 'org-default-01', name: 'Monitoring & Evaluation', type: 'expense', code: '5070', description: 'Project audits, impact studies', isSystem: true }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-prod-001',
    orgId: 'org-default-01',
    productName: 'Rice 25kg',
    sku: 'RICE-25KG',
    category: 'Staple Foods',
    openingQuantity: 120,
    currentQuantity: 120,
    unitCost: 2700,
    unitPrice: 3900,
    reorderLevel: 25,
    lastUpdated: new Date().toISOString(),
    description: 'Retail stock for fast-moving household consumption'
  },
  {
    id: 'inv-prod-002',
    orgId: 'org-default-01',
    productName: 'Cooking Oil 5L',
    sku: 'OIL-5L',
    category: 'Groceries',
    openingQuantity: 80,
    currentQuantity: 80,
    unitCost: 4200,
    unitPrice: 5900,
    reorderLevel: 20,
    lastUpdated: new Date().toISOString(),
    description: 'Processed edible oil'
  }
];

const DEFAULT_PROJECTS: ProjectFund[] = [
  {
    id: 'proj-01',
    orgId: 'org-default-01',
    name: 'Rural Water & Sanitation Project (RWSP)',
    code: 'PROJ-2026-RWSP',
    type: 'project',
    donorName: 'Global Water Trust Foundation',
    totalBudget: 60000000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active'
  },
  {
    id: 'proj-02',
    orgId: 'org-default-01',
    name: 'Youth Digital Skills & Education Grant',
    code: 'GRANT-YOUTH-TECH',
    type: 'grant',
    donorName: 'USAID / EU Innovation Fund',
    totalBudget: 95000000,
    startDate: '2026-02-01',
    endDate: '2027-01-31',
    status: 'active'
  },
  {
    id: 'proj-03',
    orgId: 'org-default-01',
    name: 'Emergency Relief Response Fund',
    code: 'FUND-RELIEF-26',
    type: 'fund',
    donorName: 'Community Emergency Campaign',
    totalBudget: 30000000,
    startDate: '2026-01-15',
    endDate: '2026-08-30',
    status: 'active'
  }
];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-01', orgId: 'org-default-01', name: 'Programs & Operations', code: 'DP-PROG', costCentre: 'CC-101' },
  { id: 'dept-02', orgId: 'org-default-01', name: 'Finance & Administration', code: 'DP-FIN', costCentre: 'CC-102' },
  { id: 'dept-03', orgId: 'org-default-01', name: 'Monitoring, Evaluation & Learning', code: 'DP-MEL', costCentre: 'CC-103' }
];

const todayStr = new Date().toISOString().split('T')[0];

const DEFAULT_RECEIPTS: Receipt[] = [
  {
    id: 'rcpt-101',
    orgId: 'org-default-01',
    receiptNumber: 'RCPT-2026-000001',
    date: todayStr,
    time: '09:15',
    receivedFrom: 'Global Water Trust Foundation',
    description: 'Q3 Disbursement for Rural Water & Sanitation Project',
    categoryId: 'cat-inc-01',
    accountId: 'acct-bank-02',
    paymentMethod: 'bank',
    amount: 25000000,
    referenceNo: 'BANK-TRF-992019',
    customerDonorMember: 'Global Water Trust',
    projectFundId: 'proj-01',
    departmentId: 'dept-01',
    notes: 'Direct wire transfer received cleanly.',
    recordedByUserId: 'usr-entry-03',
    recordedByName: 'Chifundo Mwale',
    createdAt: `${todayStr}T09:15:00Z`
  },
  {
    id: 'rcpt-102',
    orgId: 'org-default-01',
    receiptNumber: 'RCPT-2026-000002',
    date: todayStr,
    time: '11:40',
    receivedFrom: 'Community Fundraising Committee',
    description: 'Cash collections from Annual Gala Dinner tickets',
    categoryId: 'cat-inc-04',
    accountId: 'acct-cash-01',
    paymentMethod: 'cash',
    amount: 350000,
    referenceNo: 'GALA-TICKETS-CASH',
    customerDonorMember: 'Public Attendees',
    projectFundId: 'proj-03',
    departmentId: 'dept-02',
    notes: 'Counted and verified at cash desk.',
    recordedByUserId: 'usr-entry-03',
    recordedByName: 'Chifundo Mwale',
    createdAt: `${todayStr}T11:40:00Z`
  },
  {
    id: 'rcpt-103',
    orgId: 'org-default-01',
    receiptNumber: 'RCPT-2026-000003',
    date: '2026-08-12',
    time: '14:20',
    receivedFrom: 'Airtel Money Merchant Donations',
    description: 'Mobile Money public donation campaign receipts',
    categoryId: 'cat-inc-02',
    accountId: 'acct-mobile-01',
    paymentMethod: 'mobile_money',
    amount: 1450000,
    referenceNo: 'AIRTEL-BULK-0812',
    customerDonorMember: 'Individual Donors',
    projectFundId: 'proj-03',
    recordedByUserId: 'usr-fm-02',
    recordedByName: 'Sarah Chisale',
    createdAt: '2026-08-12T14:20:00Z'
  }
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 'pay-201',
    orgId: 'org-default-01',
    paymentNumber: 'PAY-2026-000001',
    date: todayStr,
    time: '10:00',
    payee: 'Apex Borehole Drilling & Engineering Ltd',
    description: 'Down payment for 3 borehole installations in District B',
    categoryId: 'cat-exp-01',
    accountId: 'acct-bank-01',
    paymentMethod: 'bank',
    amount: 8500000,
    referenceNo: 'INV-APEX-2026-44',
    invoiceNo: 'APEX-44',
    poNo: 'PO-2026-089',
    supplierName: 'Apex Drilling Ltd',
    projectFundId: 'proj-01',
    departmentId: 'dept-01',
    notes: 'Approved by Executive Director.',
    recordedByUserId: 'usr-fm-02',
    recordedByName: 'Sarah Chisale',
    status: 'approved',
    approvedByUserId: 'usr-approver-04',
    approvedByName: 'Dr. Evelyn Phiri',
    approvedAt: `${todayStr}T10:30:00Z`,
    createdAt: `${todayStr}T10:00:00Z`
  },
  {
    id: 'pay-202',
    orgId: 'org-default-01',
    paymentNumber: 'PAY-2026-000002',
    date: todayStr,
    time: '12:30',
    payee: 'City Station Fuel Services',
    description: 'Field supervision vehicle fuel vouchers (Petty cash)',
    categoryId: 'cat-exp-04',
    accountId: 'acct-cash-01',
    paymentMethod: 'cash',
    amount: 115000,
    referenceNo: 'PETTY-VOUCHER-0813',
    supplierName: 'City Station Fuel',
    projectFundId: 'proj-01',
    departmentId: 'dept-01',
    recordedByUserId: 'usr-entry-03',
    recordedByName: 'Chifundo Mwale',
    status: 'paid',
    createdAt: `${todayStr}T12:30:00Z`
  },
  {
    id: 'pay-203',
    orgId: 'org-default-01',
    paymentNumber: 'PAY-2026-000003',
    date: '2026-08-11',
    time: '15:10',
    payee: 'Digital Hub Printing Press',
    description: 'Printing youth training workbooks & banners',
    categoryId: 'cat-exp-03',
    accountId: 'acct-bank-01',
    paymentMethod: 'bank',
    amount: 1850000,
    referenceNo: 'INV-DIGI-88',
    invoiceNo: 'DIGI-88',
    supplierName: 'Digital Hub Press',
    projectFundId: 'proj-02',
    departmentId: 'dept-03',
    recordedByUserId: 'usr-entry-03',
    recordedByName: 'Chifundo Mwale',
    status: 'pending_approval',
    createdAt: '2026-08-11T15:10:00Z'
  }
];

const DEFAULT_TRANSFERS: Transfer[] = [
  {
    id: 'trf-301',
    orgId: 'org-default-01',
    transferNumber: 'TRF-2026-000001',
    date: todayStr,
    time: '08:30',
    fromAccountId: 'acct-bank-01',
    toAccountId: 'acct-cash-01',
    amount: 350000,
    feeAmount: 1500,
    referenceNo: 'CHK-WITHDRAWAL-091',
    description: 'Petty cash replenishment withdrawal from Standard Bank',
    recordedByUserId: 'usr-entry-03',
    recordedByName: 'Chifundo Mwale',
    createdAt: `${todayStr}T08:30:00Z`
  }
];

const DEFAULT_CASH_COUNTS: DailyCashCount[] = [
  {
    id: 'cashcount-401',
    orgId: 'org-default-01',
    accountId: 'acct-cash-01',
    date: todayStr,
    openingCash: 250000,
    cashReceipts: 350000,
    cashPayments: 115000,
    expectedClosingCash: 485000,
    actualPhysicalCash: 460000,
    cashDifference: -25000,
    status: 'SHORTAGE',
    explanation: 'MWK 25,000 cash shortage noted during evening count. Under investigation by finance officer.',
    personResponsible: 'Chifundo Mwale',
    createdAt: `${todayStr}T17:00:00Z`
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    orgId: 'org-default-01',
    userId: 'usr-admin-01',
    userName: 'James Banda',
    userRole: 'admin',
    action: 'ORGANIZATION_INITIALIZED',
    module: 'System',
    details: 'Created organization Hope Horizon Foundation with base currency MWK.',
    timestamp: '2026-01-01T08:00:00Z'
  },
  {
    id: 'audit-002',
    orgId: 'org-default-01',
    userId: 'usr-entry-03',
    userName: 'Chifundo Mwale',
    userRole: 'data_entry',
    action: 'RECEIPT_CREATED',
    module: 'Receipts',
    details: 'Recorded RCPT-2026-000001 for MWK 25,000,000 from Global Water Trust.',
    timestamp: `${todayStr}T09:15:00Z`
  },
  {
    id: 'audit-003',
    orgId: 'org-default-01',
    userId: 'usr-approver-04',
    userName: 'Dr. Evelyn Phiri',
    userRole: 'approver',
    action: 'PAYMENT_APPROVED',
    module: 'Approvals',
    details: 'Approved payment PAY-2026-000001 for MWK 8,500,000 to Apex Drilling.',
    timestamp: `${todayStr}T10:30:00Z`
  },
  {
    id: 'audit-004',
    orgId: 'org-default-01',
    userId: 'usr-entry-03',
    userName: 'Chifundo Mwale',
    userRole: 'data_entry',
    action: 'CASH_COUNT_SUBMITTED',
    module: 'Cash Control',
    details: 'Submitted cash count for Main Petty Cash Office. SHORTAGE of MWK 25,000 recorded.',
    timestamp: `${todayStr}T17:00:00Z`
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-01',
    orgId: 'org-default-01',
    title: 'Cash Shortage Alert',
    message: 'Main Petty Cash Office reported a SHORTAGE of MWK 25,000 during today\'s cash count.',
    type: 'warning',
    isRead: false,
    createdAt: `${todayStr}T17:01:00Z`,
    linkView: 'cash-control'
  },
  {
    id: 'notif-02',
    orgId: 'org-default-01',
    title: 'Payment Pending Approval',
    message: 'PAY-2026-000003 for Digital Hub Printing Press (MWK 1,850,000) requires sign-off.',
    type: 'info',
    isRead: false,
    createdAt: '2026-08-11T15:10:00Z',
    linkView: 'approvals'
  }
];

export interface AppDataStore {
  organizations: Organization[];
  activeOrgId: string;
  currentUser: User;
  users: User[];
  accounts: Account[];
  categories: Category[];
  inventory: InventoryItem[];
  inventoryImportApprovals: InventoryImportApproval[];
  inventoryMovements: InventoryMovement[];
  projects: ProjectFund[];
  departments: Department[];
  receipts: Receipt[];
  payments: Payment[];
  transfers: Transfer[];
  cashCounts: DailyCashCount[];
  reconciliations: BankReconciliation[];
  shareLinks: ReportShareLink[];
  auditLogs: AuditLog[];
  notifications: Notification[];
}

function getInitialStore(): AppDataStore {
  const persistedState = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(SESSION_SNAPSHOT_KEY);

  if (persistedState) {
    try {
      const parsed = JSON.parse(persistedState) as Partial<AppDataStore>;
      return {
        organizations: parsed.organizations || [DEFAULT_ORG],
        activeOrgId: parsed.activeOrgId || DEFAULT_ORG.id,
        currentUser: parsed.currentUser || ({} as User),
        users: parsed.users || [],
        accounts: parsed.accounts || DEFAULT_ACCOUNTS,
        categories: parsed.categories || DEFAULT_CATEGORIES,
        inventory: parsed.inventory || DEFAULT_INVENTORY,
        inventoryImportApprovals: parsed.inventoryImportApprovals || [],
        inventoryMovements: parsed.inventoryMovements || [],
        projects: parsed.projects || DEFAULT_PROJECTS,
        departments: parsed.departments || DEFAULT_DEPARTMENTS,
        receipts: parsed.receipts || DEFAULT_RECEIPTS,
        payments: parsed.payments || DEFAULT_PAYMENTS,
        transfers: parsed.transfers || DEFAULT_TRANSFERS,
        cashCounts: parsed.cashCounts || DEFAULT_CASH_COUNTS,
        reconciliations: parsed.reconciliations || [],
        shareLinks: parsed.shareLinks || [],
        auditLogs: parsed.auditLogs || DEFAULT_AUDIT_LOGS,
        notifications: parsed.notifications || DEFAULT_NOTIFICATIONS
      };
    } catch (e) {
      console.error('Failed to parse persisted storage data, returning default seed.', e);
    }
  }

  return {
    organizations: [DEFAULT_ORG],
    activeOrgId: DEFAULT_ORG.id,
    currentUser: {} as User,
    users: [],
    accounts: DEFAULT_ACCOUNTS,
    categories: DEFAULT_CATEGORIES,
    inventory: DEFAULT_INVENTORY,
    inventoryImportApprovals: [],
    inventoryMovements: [],
    projects: DEFAULT_PROJECTS,
    departments: DEFAULT_DEPARTMENTS,
    receipts: DEFAULT_RECEIPTS,
    payments: DEFAULT_PAYMENTS,
    transfers: DEFAULT_TRANSFERS,
    cashCounts: DEFAULT_CASH_COUNTS,
    reconciliations: [],
    shareLinks: [],
    auditLogs: DEFAULT_AUDIT_LOGS,
    notifications: DEFAULT_NOTIFICATIONS
  };
}

let currentStore: AppDataStore = getInitialStore();
const listeners: Array<() => void> = [];

function computeAccountBalanceFromLedger(store: AppDataStore, orgId: string, accountId: string): number {
  const account = store.accounts.find(a => a.id === accountId && a.orgId === orgId);
  if (!account) return 0;

  const receipts = store.receipts
    .filter(r => r.orgId === orgId && r.accountId === accountId)
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  const payments = store.payments
    .filter(p => p.orgId === orgId && p.accountId === accountId && (p.status === 'approved' || p.status === 'paid'))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const incomingTransfers = store.transfers
    .filter(t => t.orgId === orgId && t.toAccountId === accountId)
    .reduce((sum, transfer) => sum + transfer.amount, 0);

  const outgoingTransfers = store.transfers
    .filter(t => t.orgId === orgId && t.fromAccountId === accountId)
    .reduce((sum, transfer) => sum + transfer.amount + transfer.feeAmount, 0);

  return receipts - payments + incomingTransfers - outgoingTransfers;
}

function reconcileAccountBalances(store: AppDataStore) {
  store.accounts = store.accounts.map(account => ({
    ...account,
    currentBalance: computeAccountBalanceFromLedger(store, account.orgId, account.id)
  }));
}

export function saveStore(store: AppDataStore) {
  reconcileAccountBalances(store);
  currentStore = store;
  persistSnapshot(store);
  listeners.forEach(fn => fn());
}

function flushCurrentStoreToStorage() {
  try {
    persistSnapshot(currentStore);
  } catch (error) {
    console.error('Failed to flush current store before unload', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushCurrentStoreToStorage);
  window.addEventListener('pagehide', flushCurrentStoreToStorage);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushCurrentStoreToStorage();
    }
  });
}

export function buildOrganizationArchive(orgId: string) {
  const store = getStore();
  const organization = store.organizations.find(org => org.id === orgId);
  if (!organization) return null;

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    organization,
    users: store.users.filter(user => user.orgId === orgId),
    accounts: store.accounts.filter(account => account.orgId === orgId),
    categories: store.categories.filter(category => category.orgId === orgId),
    inventory: store.inventory.filter(item => item.orgId === orgId),
    inventoryImportApprovals: store.inventoryImportApprovals.filter(approval => approval.orgId === orgId),
    inventoryMovements: store.inventoryMovements.filter(movement => movement.orgId === orgId),
    projects: store.projects.filter(project => project.orgId === orgId),
    departments: store.departments.filter(department => department.orgId === orgId),
    receipts: store.receipts.filter(receipt => receipt.orgId === orgId),
    payments: store.payments.filter(payment => payment.orgId === orgId),
    transfers: store.transfers.filter(transfer => transfer.orgId === orgId),
    cashCounts: store.cashCounts.filter(count => count.orgId === orgId),
    reconciliations: store.reconciliations.filter(reconciliation => reconciliation.orgId === orgId),
    shareLinks: store.shareLinks.filter(link => link.orgId === orgId),
    auditLogs: store.auditLogs.filter(log => log.orgId === orgId),
    notifications: store.notifications.filter(notification => notification.orgId === orgId)
  };
}

export function downloadOrganizationArchive(orgId: string): void {
  const archive = buildOrganizationArchive(orgId);
  const store = getStore();
  const organization = store.organizations.find(org => org.id === orgId);
  if (!archive || !organization) return;

  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${organization.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-archive.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importOrganizationArchive(rawArchive: string): Organization {
  try {
    const parsed = JSON.parse(rawArchive) as {
      organization?: Organization;
      users?: User[];
      accounts?: Account[];
      categories?: Category[];
      inventory?: InventoryItem[];
      inventoryImportApprovals?: InventoryImportApproval[];
      inventoryMovements?: InventoryMovement[];
      projects?: ProjectFund[];
      departments?: Department[];
      receipts?: Receipt[];
      payments?: Payment[];
      transfers?: Transfer[];
      cashCounts?: DailyCashCount[];
      reconciliations?: BankReconciliation[];
      shareLinks?: ReportShareLink[];
      auditLogs?: AuditLog[];
      notifications?: Notification[];
    };

    if (!parsed.organization) {
      throw new Error('Invalid archive: no organization record found.');
    }

    const store = getStore();
    const importedOrg = { ...parsed.organization };
    const newOrgId = store.organizations.some(org => org.id === importedOrg.id)
      ? `org-${Date.now()}`
      : importedOrg.id;

    const remapId = <T extends { id: string }>(item: T, fallbackPrefix: string): T => {
      const existingId = item.id;
      const hasConflict = store.organizations.some(org => org.id === existingId)
        || store.users.some(user => user.id === existingId)
        || store.accounts.some(account => account.id === existingId)
        || store.categories.some(category => category.id === existingId)
        || store.inventory.some(inv => inv.id === existingId)
        || store.inventoryMovements.some(movement => movement.id === existingId)
        || store.projects.some(project => project.id === existingId)
        || store.departments.some(department => department.id === existingId)
        || store.receipts.some(receipt => receipt.id === existingId)
        || store.payments.some(payment => payment.id === existingId)
        || store.transfers.some(transfer => transfer.id === existingId)
        || store.cashCounts.some(count => count.id === existingId)
        || store.reconciliations.some(reconciliation => reconciliation.id === existingId)
        || store.shareLinks.some(link => link.id === existingId)
        || store.auditLogs.some(log => log.id === existingId)
        || store.notifications.some(notification => notification.id === existingId);

      if (!hasConflict) return item;

      const uniqueId = `${fallbackPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return { ...item, id: uniqueId } as T;
    };

    const org = { ...importedOrg, id: newOrgId } as Organization;

    const users = (parsed.users || []).map(user => remapId({ ...user, orgId: newOrgId }, 'usr'));
    const accounts = (parsed.accounts || []).map(account => remapId({ ...account, orgId: newOrgId }, 'acct'));
    const categories = (parsed.categories || []).map(category => remapId({ ...category, orgId: newOrgId }, 'cat'));
    const inventory = (parsed.inventory || []).map(item => remapId({ ...item, orgId: newOrgId }, 'inv'));
    const inventoryImportApprovals = (parsed.inventoryImportApprovals || []).map(approval => remapId({ ...approval, orgId: newOrgId }, 'appr'));
    const inventoryMovements = (parsed.inventoryMovements || []).map(movement => remapId({ ...movement, orgId: newOrgId }, 'mov'));
    const projects = (parsed.projects || []).map(project => remapId({ ...project, orgId: newOrgId }, 'proj'));
    const departments = (parsed.departments || []).map(department => remapId({ ...department, orgId: newOrgId }, 'dept'));
    const receipts = (parsed.receipts || []).map(receipt => remapId({ ...receipt, orgId: newOrgId }, 'rcpt'));
    const payments = (parsed.payments || []).map(payment => remapId({ ...payment, orgId: newOrgId }, 'pay'));
    const transfers = (parsed.transfers || []).map(transfer => remapId({ ...transfer, orgId: newOrgId }, 'trf'));
    const cashCounts = (parsed.cashCounts || []).map(count => remapId({ ...count, orgId: newOrgId }, 'count'));
    const reconciliations = (parsed.reconciliations || []).map(reconciliation => remapId({ ...reconciliation, orgId: newOrgId }, 'recon'));
    const shareLinks = (parsed.shareLinks || []).map(link => remapId({ ...link, orgId: newOrgId }, 'share'));
    const auditLogs = (parsed.auditLogs || []).map(log => remapId({ ...log, orgId: newOrgId }, 'audit'));
    const notifications = (parsed.notifications || []).map(notification => remapId({ ...notification, orgId: newOrgId }, 'notif'));

    const nextStore: AppDataStore = {
      ...store,
      organizations: [...store.organizations, org],
      users: [...store.users, ...users],
      accounts: [...store.accounts, ...accounts],
      categories: [...store.categories, ...categories],
      inventory: [...store.inventory, ...inventory],
      inventoryImportApprovals: [...store.inventoryImportApprovals, ...inventoryImportApprovals],
      inventoryMovements: [...store.inventoryMovements, ...inventoryMovements],
      projects: [...store.projects, ...projects],
      departments: [...store.departments, ...departments],
      receipts: [...store.receipts, ...receipts],
      payments: [...store.payments, ...payments],
      transfers: [...store.transfers, ...transfers],
      cashCounts: [...store.cashCounts, ...cashCounts],
      reconciliations: [...store.reconciliations, ...reconciliations],
      shareLinks: [...store.shareLinks, ...shareLinks],
      auditLogs: [...store.auditLogs, ...auditLogs],
      notifications: [...store.notifications, ...notifications],
      activeOrgId: newOrgId,
      currentUser: store.currentUser || ({} as User)
    };

    saveStore(nextStore);
    return org;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unable to import organization archive.');
  }
}

export function openEmailDraft(to: string[], subject: string, body: string): void {
  const recipients = to.filter(Boolean).join(',');
  if (!recipients) return;
  window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function subscribeStore(listener: () => void) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getStore(): AppDataStore {
  return currentStore;
}

export function getActiveOrganization(): Organization {
  const store = getStore();
  const found = store.organizations.find(o => o.id === store.activeOrgId);
  return found || store.organizations[0] || DEFAULT_ORG;
}

export function getActiveUser(): User {
  return getStore().currentUser;
}

export function logAudit(action: string, moduleName: string, details: string) {
  const store = getStore();
  const user = getActiveUser();
  const org = getActiveOrganization();

  const newLog: AuditLog = {
    id: `audit-${Date.now()}`,
    orgId: org.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    module: moduleName,
    details,
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString()
  };

  store.auditLogs.unshift(newLog);
  saveStore(store);
}

export function calculateAccountBalance(orgId: string, accountId: string): number {
  const store = getStore();
  const account = store.accounts.find(a => a.id === accountId && a.orgId === orgId);
  if (!account) return 0;

  const receipts = store.receipts
    .filter(r => r.orgId === orgId && r.accountId === accountId)
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const payments = store.payments
    .filter(p => p.orgId === orgId && p.accountId === accountId && (p.status === 'approved' || p.status === 'paid'))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const incomingTransfers = store.transfers
    .filter(t => t.orgId === orgId && t.toAccountId === accountId)
    .reduce((sum, transfer) => sum + transfer.amount, 0);
  const outgoingTransfers = store.transfers
    .filter(t => t.orgId === orgId && t.fromAccountId === accountId)
    .reduce((sum, transfer) => sum + transfer.amount + transfer.feeAmount, 0);

  return receipts - payments + incomingTransfers - outgoingTransfers;
}

function getProductFieldValue(row: Record<string, unknown>, candidates: string[]): string {
  const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key.toLowerCase().replace(/[^a-z0-9]+/g, '').trim()] = value;
    return acc;
  }, {});

  for (const candidate of candidates) {
    const key = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    if (normalized[key] !== undefined) {
      return String(normalized[key]).trim();
    }
  }

  return '';
}

function parseQuantityValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned) return 0;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

export function queueInventoryImportApprovals(orgId: string, fileName: string, rows: Record<string, unknown>[], user: User): InventoryImportApproval[] {
  const store = getStore();
  const pendingApprovals: InventoryImportApproval[] = [];

  rows.forEach((row, index) => {
    const productValue = getProductFieldValue(row, ['product', 'productname', 'item', 'inventoryitem', 'name', 'sku', 'code']);
    if (!productValue) return;

    const quantityValue = getProductFieldValue(row, ['quantity', 'qty', 'sold', 'unitssold', 'salesquantity', 'soldquantity', 'quantitysold', 'units']);
    const parsedQty = parseQuantityValue(quantityValue || row.quantity || row.qty || row.sold || row.units);
    if (!parsedQty || parsedQty <= 0) return;

    const matchedItem = findInventoryProductMatch(orgId, productValue) ||
      store.inventory.find(item => item.orgId === orgId && (
        item.productName.toLowerCase() === productValue.toLowerCase() ||
        item.sku.toLowerCase() === productValue.toLowerCase()
      ));

    if (!matchedItem) return;

    const approval: InventoryImportApproval = {
      id: `approval-inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      productId: matchedItem.id,
      productName: matchedItem.productName,
      importedQuantity: parsedQty,
      existingQuantity: matchedItem.currentQuantity,
      proposedQuantity: Math.max(0, matchedItem.currentQuantity - parsedQty),
      unitPrice: matchedItem.unitPrice,
      sourceFileName: fileName,
      sourceRow: index + 2,
      status: 'pending',
      createdByUserId: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString()
    };

    pendingApprovals.push(approval);
    store.inventoryImportApprovals = [approval, ...store.inventoryImportApprovals.filter(item => item.productId !== matchedItem.id || item.status !== 'pending')];
  });

  if (pendingApprovals.length > 0) {
    saveStore(store);
  }

  return pendingApprovals;
}

export function importSalesFromWorkbook(orgId: string, fileName: string, file: File, user: User): InventoryImportApproval[] {
  const workbook = XLSX.read(file, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  return queueInventoryImportApprovals(orgId, fileName, rows, user);
}

export function approveInventoryImport(approvalId: string, approver: User) {
  const store = getStore();
  const approval = store.inventoryImportApprovals.find(item => item.id === approvalId);
  if (!approval) return null;

  const item = store.inventory.find(inv => inv.id === approval.productId && inv.orgId === approval.orgId);
  if (!item) return null;

  item.currentQuantity = Math.max(0, item.currentQuantity - approval.importedQuantity);
  item.lastUpdated = new Date().toISOString();

  store.inventoryMovements.unshift({
    id: `mov-${Date.now()}`,
    orgId: approval.orgId,
    itemId: item.id,
    productName: item.productName,
    movementType: 'sale',
    quantity: -approval.importedQuantity,
    unitCost: approval.unitPrice ?? item.unitCost,
    reference: approval.sourceFileName || 'EXCEL_IMPORT',
    notes: `Approved imported sales update from ${approval.sourceFileName || 'Excel file'}`,
    createdByUserId: approver.id,
    createdByName: approver.name,
    createdAt: new Date().toISOString()
  });

  approval.status = 'approved';
  approval.approvedByUserId = approver.id;
  approval.approvedByName = approver.name;
  approval.approvedAt = new Date().toISOString();

  saveStore(store);
  return approval;
}

export function rejectInventoryImport(approvalId: string, user: User, reason: string) {
  const store = getStore();
  const approval = store.inventoryImportApprovals.find(item => item.id === approvalId);
  if (!approval) return null;

  approval.status = 'rejected';
  approval.rejectedByUserId = user.id;
  approval.rejectedByName = user.name;
  approval.rejectedAt = new Date().toISOString();
  approval.rejectionReason = reason;

  saveStore(store);
  return approval;
}

export function getInventorySummary(orgId: string) {
  const store = getStore();
  const items = (store.inventory || []).filter(item => item.orgId === orgId);

  return {
    totalItems: items.length,
    totalUnits: items.reduce((sum, item) => sum + item.currentQuantity, 0),
    openingUnits: items.reduce((sum, item) => sum + item.openingQuantity, 0),
    lowStockItems: items.filter(item => item.currentQuantity <= item.reorderLevel).length,
    inventoryValue: items.reduce((sum, item) => sum + (item.currentQuantity * item.unitCost), 0),
    items
  };
}

export function getBusinessInventorySnapshot(orgId: string) {
  const store = getStore();
  const items = (store.inventory || []).filter(item => item.orgId === orgId);

  return {
    openingInventory: items.reduce((sum, item) => sum + item.openingQuantity, 0),
    expectedInventoryAfterSales: items.reduce((sum, item) => sum + item.currentQuantity, 0),
    soldUnits: items.reduce((sum, item) => sum + Math.max(0, item.openingQuantity - item.currentQuantity), 0),
    items
  };
}

function normalizeInventoryName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findInventoryProductMatch(orgId: string, query: string): InventoryItem | null {
  const store = getStore();
  const items = (store.inventory || []).filter(item => item.orgId === orgId);
  const trimmed = query.trim();

  if (!trimmed) return null;

  const normalizedQuery = normalizeInventoryName(trimmed);
  let bestMatch: InventoryItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    const normalizedName = normalizeInventoryName(item.productName);
    const normalizedSku = normalizeInventoryName(item.sku);
    const exact = normalizedName === normalizedQuery || normalizedSku === normalizedQuery;
    const contains = normalizedName.includes(normalizedQuery)
      || normalizedQuery.includes(normalizedName)
      || normalizedSku.includes(normalizedQuery)
      || normalizedQuery.includes(normalizedSku);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const tokenMatch = tokens.some(token => normalizedName.includes(token) || normalizedSku.includes(token));
    const score = exact ? 1 : contains ? 0.9 : tokenMatch ? 0.7 : 0;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestScore >= 0.7) return bestMatch;
  return null;
}

export function getInventoryProductSuggestions(orgId: string, query: string): InventoryItem[] {
  const store = getStore();
  const items = (store.inventory || []).filter(item => item.orgId === orgId);
  const trimmed = query.trim();

  if (!trimmed) return items.slice(0, 8);

  const normalizedQuery = normalizeInventoryName(trimmed);
  return items
    .map(item => {
      const normalizedName = normalizeInventoryName(item.productName);
      const normalizedSku = normalizeInventoryName(item.sku);
      const searchableText = `${normalizedName} ${normalizedSku}`;
      const score = normalizedName === normalizedQuery || normalizedSku === normalizedQuery ? 3
        : searchableText.includes(normalizedQuery) || normalizedQuery.includes(normalizedName) || normalizedQuery.includes(normalizedSku) ? 2
        : normalizedQuery.split(' ').filter(Boolean).some(token => searchableText.includes(token)) ? 1
        : 0;
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(entry => entry.item);
}

export function updateInventoryFromReceipt(orgId: string, receipt: Receipt) {
  if (!receipt.productId || !receipt.quantity || receipt.quantity <= 0) return;

  const store = getStore();
  const item = store.inventory.find(inv => inv.id === receipt.productId && inv.orgId === orgId);
  if (!item) return;

  const updatedQuantity = Math.max(0, item.currentQuantity - receipt.quantity);
  item.currentQuantity = updatedQuantity;
  item.lastUpdated = new Date().toISOString();

  saveStore(store);
}

export function calculateDailyCashPosition(orgId: string, date: string) {
  const store = getStore();
  const cashAccounts = store.accounts.filter(item => item.orgId === orgId && item.type === 'cash');
  if (cashAccounts.length === 0) {
    return { openingCash: 0, cashReceipts: 0, cashPayments: 0, expectedClosingCash: 0 };
  }

  const cashAccountIds = new Set(cashAccounts.map(account => account.id));
  const receipts = store.receipts.filter(receipt => receipt.orgId === orgId && cashAccountIds.has(receipt.accountId));
  const payments = store.payments.filter(payment =>
    payment.orgId === orgId && cashAccountIds.has(payment.accountId) &&
    (payment.status === 'approved' || payment.status === 'paid')
  );
  const openingCash = cashAccounts.reduce((sum, account) => {
    const priorCashCount = store.cashCounts
      .filter(count => count.orgId === orgId && count.accountId === account.id && count.date < date)
      .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))[0];
    const transactionStartDate = priorCashCount?.date || '';
    const accountOpening = priorCashCount?.actualPhysicalCash ?? 0;
    const receiptsAfterOpening = receipts
      .filter(receipt => receipt.accountId === account.id && receipt.date > transactionStartDate && receipt.date < date && receipt.paymentMethod === 'cash')
      .reduce((accountSum, receipt) => accountSum + receipt.amount, 0);
    const paymentsAfterOpening = payments
      .filter(payment => payment.accountId === account.id && payment.date > transactionStartDate && payment.date < date && payment.paymentMethod === 'cash')
      .reduce((accountSum, payment) => accountSum + payment.amount, 0);
    return sum + accountOpening + receiptsAfterOpening - paymentsAfterOpening;
  }, 0);
  const cashReceipts = receipts.filter(receipt => receipt.date === date && receipt.paymentMethod === 'cash')
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const cashPayments = payments.filter(payment => payment.date === date && payment.paymentMethod === 'cash')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    openingCash,
    cashReceipts,
    cashPayments,
    expectedClosingCash: openingCash + cashReceipts - cashPayments
  };
}

// Financial calculations engine - computed dynamically from underlying transactions
export function calculateFinancialSummary(orgId: string): FinancialSummary {
  const store = getStore();
  const receipts = store.receipts.filter(r => r.orgId === orgId);
  const payments = store.payments.filter(p => p.orgId === orgId && p.status !== 'voided' && p.status !== 'rejected');
  const cashCounts = store.cashCounts.filter(c => c.orgId === orgId);
  const accounts = store.accounts.filter(a => a.orgId === orgId);

  const today = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = today.substring(0, 7); // YYYY-MM
  const currentYearPrefix = today.substring(0, 4); // YYYY

  // Receipts today
  const todayReceiptsObj = receipts.filter(r => r.date === today);
  const todayReceiptsGross = todayReceiptsObj.reduce((sum, r) => sum + r.amount, 0);

  // Payments today
  const todayPaymentsObj = payments.filter(p => p.date === today && (p.status === 'approved' || p.status === 'paid'));
  const todayPayments = todayPaymentsObj.reduce((sum, p) => sum + p.amount, 0);

  // Channel balances use the recorded transaction method and start at zero.
  const calculateChannelBalance = (method: Receipt['paymentMethod']) => {
    const channelReceipts = receipts
      .filter(receipt => receipt.paymentMethod === method)
      .reduce((sum, receipt) => sum + receipt.amount, 0);
    const channelPayments = payments
      .filter(payment => payment.paymentMethod === method && (payment.status === 'approved' || payment.status === 'paid'))
      .reduce((sum, payment) => sum + payment.amount, 0);
    return channelReceipts - channelPayments;
  };

  const totalCashBalance = calculateChannelBalance('cash');
  const totalBankBalance = calculateChannelBalance('bank');
  const totalMobileMoneyBalance = calculateChannelBalance('mobile_money');

  // Today Cash calculation
  const dailyCashPosition = calculateDailyCashPosition(orgId, today);
  const { openingCash: openingCashToday, cashReceipts: cashReceiptsToday, cashPayments: cashPaymentsToday, expectedClosingCash: expectedClosingCashToday } = dailyCashPosition;

  const latestCountToday = cashCounts.find(c => c.date === today);
  const actualClosingCashToday = latestCountToday ? latestCountToday.actualPhysicalCash : expectedClosingCashToday;

  // Shortages & Excesses
  const cashShortageTotal = cashCounts.filter(c => c.status === 'SHORTAGE').reduce((sum, c) => sum + Math.abs(c.cashDifference), 0);
  const cashExcessTotal = cashCounts.filter(c => c.status === 'EXCESS').reduce((sum, c) => sum + Math.abs(c.cashDifference), 0);

  // Month totals
  const monthReceipts = receipts.filter(r => r.date.startsWith(currentMonthPrefix)).reduce((sum, r) => sum + r.amount, 0);
  const monthPayments = payments.filter(p => p.date.startsWith(currentMonthPrefix) && (p.status === 'approved' || p.status === 'paid')).reduce((sum, p) => sum + p.amount, 0);
  const netMonthMovement = monthReceipts - monthPayments;

  // Year totals
  const yearReceipts = receipts.filter(r => r.date.startsWith(currentYearPrefix)).reduce((sum, r) => sum + r.amount, 0);
  const yearPayments = payments.filter(p => p.date.startsWith(currentYearPrefix) && (p.status === 'approved' || p.status === 'paid')).reduce((sum, p) => sum + p.amount, 0);

  // Pending Approvals & Unreconciled
  const pendingApprovalsCount = store.payments.filter(p => p.orgId === orgId && p.status === 'pending_approval').length;
  const unreconciledCount = store.cashCounts.filter(c => c.orgId === orgId && c.status === 'INVESTIGATION_REQUIRED').length;

  // Revenue & Cost Analysis
  // YTD calculations
  const totalRevenueYTD = yearReceipts;
  const totalExpensesYTD = yearPayments;
  const netProfitYTD = totalRevenueYTD - totalExpensesYTD;
  const profitMarginYTD = totalRevenueYTD > 0 ? (netProfitYTD / totalRevenueYTD) * 100 : 0;

  // Month calculations
  const totalRevenueMonth = monthReceipts;
  const totalExpensesMonth = monthPayments;
  const netProfitMonth = totalRevenueMonth - totalExpensesMonth;
  const profitMarginMonth = totalRevenueMonth > 0 ? (netProfitMonth / totalRevenueMonth) * 100 : 0;

  // Tax calculations (using default 16.5% tax rate)
  const defaultTaxRate = 16.5;
  const estimatedTaxLiabilityYTD = (netProfitYTD * defaultTaxRate) / 100;
  const taxableIncomeYTD = Math.max(0, netProfitYTD);

  return {
    todayReceipts: todayReceiptsGross,
    todayPayments,
    openingCashToday,
    expectedClosingCashToday,
    actualClosingCashToday,
    totalCashBalance,
    totalBankBalance,
    totalMobileMoneyBalance,
    cashShortageTotal,
    cashExcessTotal,
    monthReceipts,
    monthPayments,
    netMonthMovement,
    yearReceipts,
    yearPayments,
    pendingApprovalsCount,
    unreconciledCount,
    // Revenue & Cost
    totalRevenueYTD,
    totalExpensesYTD,
    netProfitYTD,
    totalRevenueMonth,
    totalExpensesMonth,
    netProfitMonth,
    profitMarginYTD,
    profitMarginMonth,
    // Tax
    estimatedTaxLiabilityYTD,
    taxableIncomeYTD
  };
}

export function generateReceiptNumber(orgId: string): string {
  const store = getStore();
  const year = new Date().getFullYear();
  const orgReceipts = store.receipts.filter(r => r.orgId === orgId);
  const nextSeq = (orgReceipts.length + 1).toString().padStart(6, '0');
  return `RCPT-${year}-${nextSeq}`;
}

export function generatePaymentNumber(orgId: string): string {
  const store = getStore();
  const year = new Date().getFullYear();
  const orgPayments = store.payments.filter(p => p.orgId === orgId);
  const nextSeq = (orgPayments.length + 1).toString().padStart(6, '0');
  return `PAY-${year}-${nextSeq}`;
}

export function generateTransferNumber(orgId: string): string {
  const store = getStore();
  const year = new Date().getFullYear();
  const orgTransfers = store.transfers.filter(t => t.orgId === orgId);
  const nextSeq = (orgTransfers.length + 1).toString().padStart(6, '0');
  return `TRF-${year}-${nextSeq}`;
}

// Recommended category presets for organization setup wizard
export function getRecommendedCategoriesForType(orgType: string, orgId: string): Category[] {
  if (orgType === 'School') {
    return [
      { id: `cat-s1-${Date.now()}`, orgId, name: 'School Fees', type: 'income', code: '4010', description: 'Tuition fees', isSystem: true },
      { id: `cat-s2-${Date.now()}`, orgId, name: 'Registration & Exam Fees', type: 'income', code: '4020', description: 'National exam & admission fees', isSystem: true },
      { id: `cat-s3-${Date.now()}`, orgId, name: 'Boarding & Catering Fees', type: 'income', code: '4030', description: 'Student meals and accommodation', isSystem: true },
      { id: `cat-s4-${Date.now()}`, orgId, name: 'Teaching Materials & Books', type: 'expense', code: '5010', description: 'Textbooks, science lab materials', isSystem: true },
      { id: `cat-s5-${Date.now()}`, orgId, name: 'Teacher Salaries & Staff Payroll', type: 'expense', code: '5020', description: 'Academic & support staff payroll', isSystem: true },
      { id: `cat-s6-${Date.now()}`, orgId, name: 'Campus Maintenance & Utilities', type: 'expense', code: '5030', description: 'Buildings, electricity, water', isSystem: true },
    ];
  } else if (orgType === 'Church') {
    return [
      { id: `cat-c1-${Date.now()}`, orgId, name: 'Tithes & Offerings', type: 'income', code: '4010', description: 'Sunday tithes and general offerings', isSystem: true },
      { id: `cat-c2-${Date.now()}`, orgId, name: 'Building & Campaign Pledges', type: 'income', code: '4020', description: 'Special project collections', isSystem: true },
      { id: `cat-c3-${Date.now()}`, orgId, name: 'Ministry & Missions Outreach', type: 'expense', code: '5010', description: 'Evangelism & community assistance', isSystem: true },
      { id: `cat-c4-${Date.now()}`, orgId, name: 'Clergy Stipends & Salaries', type: 'expense', code: '5020', description: 'Pastoral allowances', isSystem: true },
      { id: `cat-c5-${Date.now()}`, orgId, name: 'Church Utilities & Worship Events', type: 'expense', code: '5030', description: 'PA system, power, conference costs', isSystem: true },
    ];
  } else if (orgType === 'Business') {
    return [
      { id: `cat-b1-${Date.now()}`, orgId, name: 'Product Sales Revenue', type: 'income', code: '4010', description: 'Core product sales', isSystem: true },
      { id: `cat-b2-${Date.now()}`, orgId, name: 'Service Income', type: 'income', code: '4020', description: 'Consulting and services', isSystem: true },
      { id: `cat-b3-${Date.now()}`, orgId, name: 'Cost of Goods Sold (COGS)', type: 'expense', code: '5010', description: 'Inventory purchases', isSystem: true },
      { id: `cat-b4-${Date.now()}`, orgId, name: 'Inventory Management & Stock Control', type: 'expense', code: '5015', description: 'Warehouse, ordering and inventory operations', isSystem: true },
      { id: `cat-b5-${Date.now()}`, orgId, name: 'Commercial Rent & Utilities', type: 'expense', code: '5020', description: 'Store & office lease', isSystem: true },
      { id: `cat-b6-${Date.now()}`, orgId, name: 'Marketing & Sales Promotion', type: 'expense', code: '5030', description: 'Digital ads and events', isSystem: true },
    ];
  } else if (orgType === 'Government') {
    return [
      { id: `cat-g1-${Date.now()}`, orgId, name: 'Treasury Budget Allocation', type: 'income', code: '4010', description: 'Government allocation', isSystem: true },
      { id: `cat-g2-${Date.now()}`, orgId, name: 'Licences & Service Permits', type: 'income', code: '4020', description: 'Public service collection fees', isSystem: true },
      { id: `cat-g3-${Date.now()}`, orgId, name: 'Public Procurement Expenditure', type: 'expense', code: '5010', description: 'Equipment & contractor works', isSystem: true },
      { id: `cat-g4-${Date.now()}`, orgId, name: 'Civil Service Allowances & Fuel', type: 'expense', code: '5020', description: 'Department per diems and fuel', isSystem: true },
    ];
  }

  // Default NGO preset
  return DEFAULT_CATEGORIES.map(c => ({ ...c, id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, orgId }));
}
