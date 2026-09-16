export type OrgType = 
  | 'NGO' 
  | 'Government' 
  | 'Business' 
  | 'School' 
  | 'Church' 
  | 'Association' 
  | 'Non-profit' 
  | 'Cooperative' 
  | 'Project' 
  | 'Other';

export type UserRole = 
  | 'admin' 
  | 'finance_manager' 
  | 'accounts_user' 
  | 'data_entry' 
  | 'approver' 
  | 'auditor' 
  | 'viewer';

export type AccountType = 'cash' | 'bank' | 'mobile_money';

export type CategoryType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'bank' | 'mobile_money' | 'cheque' | 'other';

export type PaymentStatus = 
  | 'draft' 
  | 'submitted' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'paid' 
  | 'voided';

export type CashCountStatus = 'RECONCILED' | 'SHORTAGE' | 'EXCESS' | 'INVESTIGATION_REQUIRED';

export interface CurrencyConfig {
  code: string;       // e.g. "MWK", "USD", "EUR", "KES", "ZAR"
  symbol: string;     // e.g. "MWK", "$", "€", "KSh", "R"
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  customType?: string;
  registrationNo?: string;
  taxId?: string;
  physicalAddress?: string;
  postalAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  country: string;
  currency: CurrencyConfig;
  fiscalYearStart: string; // e.g., "01-01"
  logoUrl?: string;
  authorizedSignatory?: string;
  contactPerson?: string;
  businessOwnerEmail?: string;
  passwordHash?: string;
  status: 'active' | 'setup_pending';
  approvalThreshold: number; // Payments above this require approval
  // Organization Theme
  themeColor?: string; // Primary color hex, e.g., "#3b82f6" for blue
  accentColor?: string; // Accent color hex
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  avatarUrl?: string;
  mfaEnabled: boolean;
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export interface Account {
  id: string;
  orgId: string;
  name: string;
  type: AccountType;
  accountNoIdentifier: string; // e.g. "1010-001" or Bank Acct #
  bankOrProviderName?: string; // e.g. "Standard Bank", "Airtel Money"
  currency: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  type: CategoryType;
  code: string; // e.g. "4010"
  description?: string;
  isSystem?: boolean;
}

export interface InventoryItem {
  id: string;
  orgId: string;
  productName: string;
  sku: string;
  category?: string;
  openingQuantity: number;
  currentQuantity: number;
  unitCost: number;
  unitPrice: number;
  reorderLevel: number;
  lastUpdated: string;
  description?: string;
}

export interface InventoryImportApproval {
  id: string;
  orgId: string;
  productId: string;
  productName: string;
  importedQuantity: number;
  existingQuantity: number;
  proposedQuantity: number;
  unitPrice?: number;
  sourceFileName?: string;
  sourceRow?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface InventoryMovement {
  id: string;
  orgId: string;
  itemId: string;
  productName: string;
  movementType: 'opening' | 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface ProjectFund {
  id: string;
  orgId: string;
  name: string;
  code: string;
  type: 'project' | 'fund' | 'grant' | 'donor_budget';
  donorName?: string;
  totalBudget: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed';
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  code: string;
  costCentre?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Receipt {
  id: string;
  orgId: string;
  receiptNumber: string; // RCPT-2026-000001
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  receivedFrom: string;
  description: string;
  categoryId: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  productId?: string;
  quantity?: number;
  referenceNo?: string;
  customerDonorMember?: string;
  projectFundId?: string;
  departmentId?: string;
  notes?: string;
  attachments?: Attachment[];
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orgId: string;
  paymentNumber: string; // PAY-2026-000001
  date: string;
  time: string;
  payee: string;
  description: string;
  categoryId: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNo?: string;
  invoiceNo?: string;
  poNo?: string;
  supplierName?: string;
  projectFundId?: string;
  departmentId?: string;
  notes?: string;
  attachments?: Attachment[];
  recordedByUserId: string;
  recordedByName: string;
  status: PaymentStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  voidedByUserId?: string;
  voidedByName?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  orgId: string;
  transferNumber: string; // TRF-2026-000001
  date: string;
  time: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  feeAmount: number;
  referenceNo?: string;
  description: string;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
}

export interface DenominationItem {
  value: number;
  label: string;
  count: number;
}

export interface DailyCashCount {
  id: string;
  orgId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  openingCash: number;
  cashReceipts: number;
  cashPayments: number;
  expectedClosingCash: number;
  actualPhysicalCash: number;
  cashDifference: number; // actual - expected
  status: CashCountStatus;
  denominations?: DenominationItem[];
  explanation?: string;
  personResponsible: string;
  createdAt: string;
}

export interface BankReconciliation {
  id: string;
  orgId: string;
  accountId: string;
  reconciliationDate: string;
  statementDate: string;
  statementEndingBalance: number;
  appCalculatedBalance: number;
  difference: number;
  status: 'balanced' | 'unbalanced';
  reconciledTransactionIds: string[];
  notes?: string;
  completedBy: string;
  createdAt: string;
}

export interface ReportShareLink {
  id: string;
  orgId: string;
  reportTitle: string;
  reportType: string;
  shareCode: string; // unique code
  passcode?: string;
  viewOnly: boolean;
  restrictDownload: boolean;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  isRevoked: boolean;
}

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  orgId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  isRead: boolean;
  createdAt: string;
  linkView?: string;
}

export interface FinancialSummary {
  todayReceipts: number;
  todayPayments: number;
  openingCashToday: number;
  expectedClosingCashToday: number;
  actualClosingCashToday: number;
  totalCashBalance: number;
  totalBankBalance: number;
  totalMobileMoneyBalance: number;
  cashShortageTotal: number;
  cashExcessTotal: number;
  monthReceipts: number;
  monthPayments: number;
  netMonthMovement: number;
  yearReceipts: number;
  yearPayments: number;
  pendingApprovalsCount: number;
  unreconciledCount: number;
  // Revenue & Cost Analysis
  totalRevenueYTD: number;
  totalExpensesYTD: number;
  netProfitYTD: number;
  totalRevenueMonth: number;
  totalExpensesMonth: number;
  netProfitMonth: number;
  profitMarginYTD: number; // percentage
  profitMarginMonth: number; // percentage
  // Tax
  estimatedTaxLiabilityYTD: number;
  taxableIncomeYTD: number;
}

// Authentication Types
export interface AuthSession {
  userId: string;
  orgId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Tax Configuration Types
export interface TaxAuthority {
  code: string; // e.g., 'MRA' for Malawi Revenue Authority
  name: string;
  country: string;
  website?: string;
  taxYearStart?: string; // e.g., "01-01" or "07-01"
}

export interface TaxConfiguration {
  id: string;
  orgId: string;
  country: string;
  taxAuthority?: TaxAuthority;
  taxIdentificationNumber?: string;
  taxRate: number; // percentage, e.g., 16.5
  capitalAllowanceRate?: number; // percentage
  deductibleExpensesCategories: string[]; // category IDs
  nonDeductibleExpensesCategories: string[]; // category IDs
  estimatedTaxPaymentSchedule?: 'quarterly' | 'monthly' | 'annual';
  taxFilingDeadline?: string; // e.g., "12-31"
  documentUploadIds?: string[]; // references to uploaded tax docs
  createdAt: string;
  updatedAt: string;
}

export interface TaxObligation {
  id: string;
  orgId: string;
  taxPeriod: string; // e.g., "2026-Q1" or "2026-01"
  taxableIncome: number;
  deductibleExpenses: number;
  nonDeductibleExpenses: number;
  taxableAmountAfterDeductions: number;
  appliedTaxRate: number;
  estimatedTaxLiability: number;
  paymentDeadline: string;
  status: 'pending' | 'partially_paid' | 'fully_paid';
  amountPaid: number;
  notes?: string;
  documentUrl?: string; // reference to tax filing document
  createdAt: string;
  updatedAt: string;
}

export interface TaxDocument {
  id: string;
  orgId: string;
  documentType: 'tax_authority_guideline' | 'tax_filing' | 'payment_receipt' | 'other';
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  taxConfigId?: string; // reference to which tax config this relates to
}

// Editable Headers/Column Configuration
export interface SheetColumnHeader {
  id: string;
  fieldKey: string; // original field name, e.g., 'receiptNumber', 'category'
  customLabel: string; // user-editable label
  isVisible: boolean;
  displayOrder: number;
}

export interface SheetHeaderConfiguration {
  id: string;
  orgId: string;
  sheetType: 'receipts' | 'payments' | 'transfers' | 'accounts' | 'categories';
  columns: SheetColumnHeader[];
  createdAt: string;
  updatedAt: string;
}
