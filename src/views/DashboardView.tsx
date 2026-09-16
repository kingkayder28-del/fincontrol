import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Phone,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldAlert,
  HelpCircle,
  FolderGit2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Organization, User, Receipt, Payment } from '../types';
import { calculateFinancialSummary, formatCurrency, getBusinessInventorySnapshot, getStore } from '../lib/storage';

interface DashboardViewProps {
  organization: Organization;
  currentUser: User;
  onNavigate: (view: string, filterParams?: any) => void;
  onOpenQuickAdd: (defaultTab?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  organization,
  currentUser,
  onNavigate,
  onOpenQuickAdd
}) => {
  const store = getStore();
  const summary = calculateFinancialSummary(organization.id);
  const inventorySnapshot = organization.type === 'Business' ? getBusinessInventorySnapshot(organization.id) : null;
  const currencySymbol = organization.currency.symbol;
  const today = new Date().toISOString().split('T')[0];
  const todayChannelTotals = [...store.receipts
    .filter(receipt => receipt.orgId === organization.id && receipt.date === today)
    .map(receipt => ({ method: receipt.paymentMethod, type: 'Receipts', amount: receipt.amount })), ...store.payments
    .filter(payment => payment.orgId === organization.id && payment.date === today && (payment.status === 'approved' || payment.status === 'paid'))
    .map(payment => ({ method: payment.paymentMethod, type: 'Payments', amount: payment.amount }))]
    .reduce<Record<string, { Receipts: number; Payments: number }>>((totals, transaction) => {
      totals[transaction.method] ||= { Receipts: 0, Payments: 0 };
      totals[transaction.method][transaction.type] += transaction.amount;
      return totals;
    }, {});

  const orgReceipts = store.receipts.filter(r => r.orgId === organization.id);
  const orgPayments = store.payments.filter(p => p.orgId === organization.id && p.status !== 'voided');

  // Prepare monthly data for Recharts (Jan to Dec of current year)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();

  const monthlyChartData = monthNames.map((month, idx) => {
    const monthStr = `${currentYear}-${(idx + 1).toString().padStart(2, '0')}`;
    const receiptsVal = orgReceipts
      .filter(r => r.date.startsWith(monthStr))
      .reduce((sum, r) => sum + r.amount, 0);
    const paymentsVal = orgPayments
      .filter(p => p.date.startsWith(monthStr) && (p.status === 'approved' || p.status === 'paid'))
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      month,
      Receipts: receiptsVal,
      Payments: paymentsVal,
      Net: receiptsVal - paymentsVal
    };
  });

  // Prepare expenditure category pie chart data
  const categoryMap: Record<string, number> = {};
  orgPayments.forEach(p => {
    const cat = store.categories.find(c => c.id === p.categoryId);
    const catName = cat ? cat.name : 'General Expense';
    categoryMap[catName] = (categoryMap[catName] || 0) + p.amount;
  });

  const categoryPieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const recentTransactions = [
    ...orgReceipts.map(r => ({ ...r, txnType: 'receipt' as const })),
    ...orgPayments.map(p => ({ ...p, txnType: 'payment' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Welcome Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[#f6f9fc] p-6 text-[var(--text)] shadow-[var(--shadow-sm)] md:flex-row md:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            <span>{organization.name}</span>
            <span>•</span>
            <span>{organization.type} Engine</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)] md:text-2xl">
            Financial Dashboard
          </h1>
          <p className="mt-1 max-w-xl text-xs text-[var(--text-muted)] md:text-sm">
            Real-time cash flow, expected balances, bank control, shortages & financial reconciliation.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onOpenQuickAdd('receipt')}
            className="flex-1 rounded-xl bg-[var(--success)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--success)]/90 md:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>+ Receipt</span>
          </button>
          <button
            onClick={() => onOpenQuickAdd('payment')}
            className="flex-1 rounded-xl bg-[var(--danger)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--danger)]/90 md:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>+ Payment</span>
          </button>
          <button
            onClick={() => onNavigate('cash-control')}
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--bg-muted)] md:flex-initial"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Cash Count</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today Receipts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Receipts
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(summary.todayReceipts, organization.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Month: {formatCurrency(summary.monthReceipts, organization.currency)}</span>
            <span className="text-emerald-600 font-medium">Recorded Live</span>
          </div>
        </div>

        {/* Today Payments */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Payments
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(summary.todayPayments, organization.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Month: {formatCurrency(summary.monthPayments, organization.currency)}</span>
            <span className="text-rose-600 font-medium">Approved / Paid</span>
          </div>
        </div>

        {/* Expected Cash Closing */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Expected Cash
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(summary.expectedClosingCashToday, organization.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Formula: Opening + In - Out</span>
            <button
              onClick={() => onNavigate('cash-control')}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              Verify Count →
            </button>
          </div>
          <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
            {Object.entries(todayChannelTotals).map(([method, totals]) => (
              <div key={method} className="flex justify-between gap-2">
                <span>{method === 'mobile_money' ? 'Mobile Money (Airtel / TNM)' : method.replace('_', ' ')}</span>
                <span>In {formatCurrency(totals.Receipts, organization.currency)} · Out {formatCurrency(totals.Payments, organization.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Shortage / Excess Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cash Difference
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              summary.cashShortageTotal > 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="text-lg md:text-xl font-extrabold mt-2 tracking-tight">
            {summary.cashShortageTotal > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                SHORTAGE — {formatCurrency(summary.cashShortageTotal, organization.currency)}
              </span>
            ) : summary.cashExcessTotal > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                EXCESS — {formatCurrency(summary.cashExcessTotal, organization.currency)}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">
                RECONCILED — 0.00
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Physical vs App Variance</span>
            <button
              onClick={() => onNavigate('cash-control')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Audit Log
            </button>
          </div>
        </div>

      </div>

      {organization.type === 'Business' && inventorySnapshot && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Inventory Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Opening stock and expected remaining inventory after sales</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Business Record</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Opening Inventory</div>
              <div className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{inventorySnapshot.openingInventory}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Units at start of period</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Units Sold</div>
              <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">{inventorySnapshot.soldUnits}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Automatically deducted after sales</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Expected Inventory After Sales</div>
              <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">{inventorySnapshot.expectedInventoryAfterSales}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Current stock on hand</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {inventorySnapshot.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.productName}</div>
                  <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{item.sku}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Opening</div>
                    <div className="font-bold">{item.openingQuantity}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Sold</div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">{Math.max(0, item.openingQuantity - item.currentQuantity)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Remaining</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">{item.currentQuantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Balances Summary Strip */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Cash Balances</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.totalCashBalance, organization.currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Bank Balances</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.totalBankBalance, organization.currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Mobile Money</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.totalMobileMoneyBalance, organization.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Monthly Receipts vs Expenditure ({currentYear})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click any month to inspect detailed transaction listings</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All Txns
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    onNavigate('transactions', { month: data.activeLabel });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val), organization.currency)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="Receipts" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Payments" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenditure Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <span>Expenditure Category Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Share of funds spent across categories</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryPieData.length === 0 ? (
              <div className="text-center text-xs text-slate-400">No payment data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val), organization.currency)}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Pending Approvals Queue & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentTransactions.map(t => {
              const isReceipt = t.txnType === 'receipt';
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isReceipt ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600'
                    }`}>
                      {isReceipt ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-slate-500">{isReceipt ? (t as Receipt).receiptNumber : (t as Payment).paymentNumber}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                          {isReceipt ? (t as Receipt).receivedFrom : (t as Payment).payee}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                        {t.description} ({t.date})
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold ${isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isReceipt ? '+' : '-'}{formatCurrency(t.amount, organization.currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">{t.paymentMethod}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Approvals & Reconciliation Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Approvals & Control Action</span>
            </h3>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Approval Inbox ({summary.pendingApprovalsCount})
            </button>
          </div>

          {summary.pendingApprovalsCount === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">No Pending Payment Approvals</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">All payment vouchers above threshold have been signed off.</p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {summary.pendingApprovalsCount} Payment Voucher(s) Awaiting Review
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Payments above approval threshold require management sign-off before payment execution.
                </div>
              </div>
              <button
                onClick={() => onNavigate('approvals')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs"
              >
                Review Now
              </button>
            </div>
          )}

          {/* Quick Nav Shortcuts */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('bank-reconciliation')}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left border border-slate-100 dark:border-slate-700/60 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600 mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Bank Reconciliation</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Match statement vs app records</div>
            </button>

            <button
              onClick={() => onNavigate('projects')}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left border border-slate-100 dark:border-slate-700/60 transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-purple-600 mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Projects & Grants</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Track donor budget vs spend</div>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
