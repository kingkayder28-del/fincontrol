import React, { useEffect, useState } from 'react';
import {
  Calculator,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  Plus,
  Coins,
  FileText
} from 'lucide-react';
import { Organization, User, DailyCashCount, DenominationItem } from '../types';
import {
  getStore,
  saveStore,
  formatCurrency,
  logAudit,
  calculateFinancialSummary,
  calculateDailyCashPosition,
  openEmailDraft
} from '../lib/storage';

interface CashControlViewProps {
  organization: Organization;
  currentUser: User;
}

export const CashControlView: React.FC<CashControlViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const cashAccounts = store.accounts.filter(a => a.orgId === orgId && a.type === 'cash');
  const [selectedAccountId, setSelectedAccountId] = useState(cashAccounts[0]?.id || '');

  const todayStr = new Date().toISOString().split('T')[0];
  const [countDate, setCountDate] = useState(todayStr);

  const targetAccount = cashAccounts.find(a => a.id === selectedAccountId) || cashAccounts[0];
  const savedCount = store.cashCounts
    .filter(count => count.orgId === orgId && count.accountId === targetAccount?.id && count.date === countDate)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const dailyCashPosition = targetAccount
    ? calculateDailyCashPosition(orgId, countDate, targetAccount.id)
    : { openingCash: 0, cashReceipts: 0, cashPayments: 0, expectedClosingCash: 0 };
  const { openingCash, cashReceipts: receiptsForAcct, cashPayments: paymentsForAcct, expectedClosingCash } = dailyCashPosition;
  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank',
    mobile_money: 'Mobile Money (Airtel / TNM)',
    cheque: 'Cheque',
    other: 'Other'
  };
  const dailyReceiptsByMethod = store.receipts
    .filter(receipt => receipt.orgId === orgId && receipt.date === countDate)
    .reduce<Record<string, number>>((totals, receipt) => {
      totals[receipt.paymentMethod] = (totals[receipt.paymentMethod] || 0) + receipt.amount;
      return totals;
    }, {});
  const dailyPaymentsByMethod = store.payments
    .filter(payment => payment.orgId === orgId && payment.date === countDate && (payment.status === 'approved' || payment.status === 'paid'))
    .reduce<Record<string, number>>((totals, payment) => {
      totals[payment.paymentMethod] = (totals[payment.paymentMethod] || 0) + payment.amount;
      return totals;
    }, {});

  // Count entry state
  const [entryMode, setEntryMode] = useState<'total' | 'denominations'>('total');
  const [directPhysicalCount, setDirectPhysicalCount] = useState<number | ''>(() => savedCount?.actualPhysicalCash ?? '');
  const [explanation, setExplanation] = useState('');
  const [personResponsible, setPersonResponsible] = useState(currentUser.name);

  useEffect(() => {
    setDirectPhysicalCount(savedCount?.actualPhysicalCash ?? '');
  }, [savedCount?.id]);

  // Denominations list based on currency
  const [denominations, setDenominations] = useState<DenominationItem[]>([
    { value: 5000, label: '5,000 Note', count: 0 },
    { value: 2000, label: '2,000 Note', count: 0 },
    { value: 1000, label: '1,000 Note', count: 0 },
    { value: 500, label: '500 Note', count: 0 },
    { value: 200, label: '200 Note', count: 0 },
    { value: 100, label: '100 Note', count: 0 },
    { value: 50, label: '50 Coin / Note', count: 0 }
  ]);

  const denomTotal = denominations.reduce((sum, d) => sum + (d.value * d.count), 0);
  const actualPhysicalCash = entryMode === 'denominations' ? denomTotal : Number(directPhysicalCount || 0);

  const cashDifference = actualPhysicalCash - expectedClosingCash;

  let computedStatus: DailyCashCount['status'] = 'RECONCILED';
  if (cashDifference < 0) {
    computedStatus = 'SHORTAGE';
  } else if (cashDifference > 0) {
    computedStatus = 'EXCESS';
  }

  const handleDenomCountChange = (index: number, countVal: number) => {
    const updated = [...denominations];
    updated[index].count = Math.max(0, countVal);
    setDenominations(updated);
  };

  const handleSubmitCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    const newCashCount: DailyCashCount = {
      id: `cashcount-${Date.now()}`,
      orgId,
      accountId: targetAccount.id,
      date: countDate,
      openingCash,
      cashReceipts: receiptsForAcct,
      cashPayments: paymentsForAcct,
      expectedClosingCash,
      actualPhysicalCash,
      cashDifference,
      status: computedStatus,
      denominations: entryMode === 'denominations' ? denominations : undefined,
      explanation: explanation.trim() || undefined,
      personResponsible: personResponsible.trim(),
      createdAt: new Date().toISOString()
    };

    store.cashCounts = [
      newCashCount,
      ...store.cashCounts.filter(count => !(count.orgId === orgId && count.accountId === targetAccount.id && count.date === countDate))
    ];

    // Create warning notification if shortage
    if (computedStatus === 'SHORTAGE') {
      store.notifications.unshift({
        id: `notif-${Date.now()}`,
        orgId,
        title: 'Cash Shortage Detected',
        message: `${targetAccount.name} reported a SHORTAGE of ${formatCurrency(Math.abs(cashDifference), organization.currency)} on ${countDate}.`,
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString(),
        linkView: 'cash-control'
      });
    }

    saveStore(store);
    logAudit(
      'CASH_COUNT_SUBMITTED',
      'Cash Control',
      `Cash Count submitted for ${targetAccount.name}. Status: ${computedStatus} (${formatCurrency(cashDifference, organization.currency)})`
    );

    const recipients = [
      organization.businessOwnerEmail || '',
      currentUser.role === 'admin' ? currentUser.email : '',
      ...store.users.filter(user => user.orgId === orgId && user.role === 'admin').map(user => user.email)
    ];
    openEmailDraft(
      recipients,
      `Daily cash count report: ${organization.name} - ${countDate}`,
      `Daily Cash Count Report\nOrganization: ${organization.name}\nAccount: ${targetAccount.name}\nDate: ${countDate}\nExpected closing cash: ${formatCurrency(expectedClosingCash, organization.currency)}\nActual physical cash: ${formatCurrency(actualPhysicalCash, organization.currency)}\nDifference: ${formatCurrency(cashDifference, organization.currency)}\nStatus: ${computedStatus}\nResponsible person: ${personResponsible}`
    );

    alert(`Cash Count recorded successfully! Status: ${computedStatus}`);
  };

  const cashCountHistory = store.cashCounts.filter(c => c.orgId === orgId);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-amber-500" />
          <span>Daily Cash Control & Count Module</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Expected Cash = Opening Cash + Cash Receipts − Cash Payments. Reconcile physical cash counts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Calculator */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Select Cash Office Account</label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:outline-none"
              >
                {cashAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.accountNoIdentifier})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Reconciliation Date</label>
              <input
                type="date"
                value={countDate}
                onChange={e => setCountDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic Expected Cash Box (CANNOT BE OVERWRITTEN) */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">System Calculated Expected Cash</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">LOCKED FORMULA</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="text-[10px] text-slate-400">Opening Cash</div>
                <div className="font-bold text-slate-200">{formatCurrency(openingCash, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="text-[10px] text-emerald-400">+ Cash Receipts</div>
                <div className="font-bold text-emerald-400">+{formatCurrency(receiptsForAcct, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="text-[10px] text-rose-400">- Cash Payments</div>
                <div className="font-bold text-rose-400">-{formatCurrency(paymentsForAcct, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-blue-950 border border-blue-800">
                <div className="text-[10px] text-blue-300 font-bold">Expected Closing</div>
                <div className="text-sm font-extrabold text-white">{formatCurrency(expectedClosingCash, organization.currency)}</div>
              </div>
            </div>
            <div className="border-t border-slate-700/60 pt-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">All recorded transactions for {countDate}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                {Object.keys({ ...dailyReceiptsByMethod, ...dailyPaymentsByMethod }).map(method => (
                  <div key={method} className="flex items-center justify-between gap-3 text-slate-300">
                    <span>{paymentMethodLabels[method] || method}</span>
                    <span>
                      Receipts {formatCurrency(dailyReceiptsByMethod[method] || 0, organization.currency)} · Payments {formatCurrency(dailyPaymentsByMethod[method] || 0, organization.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Physical Count Form */}
          <form onSubmit={handleSubmitCount} className="space-y-4 text-xs">
            
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Physical Cash Count Entry Method</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryMode('total')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    entryMode === 'total' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Direct Total
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('denominations')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    entryMode === 'denominations' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  By Notes & Coins
                </button>
              </div>
            </div>

            {entryMode === 'total' ? (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Enter Actual Physical Cash Count ({organization.currency.code}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={directPhysicalCount}
                  onChange={e => setDirectPhysicalCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Note & Coin Denomination Calculator</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {denominations.map((denom, idx) => (
                    <div key={denom.value} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{denom.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={denom.count}
                          onChange={e => handleDenomCountChange(idx, Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center rounded-lg bg-slate-100 dark:bg-slate-700 font-bold"
                        />
                        <span className="w-20 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(denom.value * denom.count, organization.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                  Denomination Total: {formatCurrency(denomTotal, organization.currency)}
                </div>
              </div>
            )}

            {/* Calculated Variance Badge (Explicit Label + Amount) */}
            <div className={`p-4 rounded-2xl border ${
              computedStatus === 'SHORTAGE'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-200'
                : computedStatus === 'EXCESS'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/80 text-blue-800 dark:text-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">CASH CONTROL STATUS</span>
                <span className="font-mono text-xs font-bold">
                  Difference: {formatCurrency(cashDifference, organization.currency)}
                </span>
              </div>
              <div className="text-lg font-extrabold mt-1 tracking-wide">
                {computedStatus === 'SHORTAGE' && (
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>SHORTAGE — {formatCurrency(Math.abs(cashDifference), organization.currency)}</span>
                  </div>
                )}
                {computedStatus === 'EXCESS' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>EXCESS — {formatCurrency(cashDifference, organization.currency)}</span>
                  </div>
                )}
                {computedStatus === 'RECONCILED' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span>RECONCILED — PERFECT MATCH</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Officer Responsible</label>
              <input
                type="text"
                required
                value={personResponsible}
                onChange={e => setPersonResponsible(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Audit Explanation / Discrepancy Note</label>
              <textarea
                rows={2}
                placeholder="Explain any shortages, excess or notes..."
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-colors"
            >
              Submit Daily Cash Count Record
            </button>

          </form>

        </div>

        {/* Right Column: Historical Cash Control Audits */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cash Count Audit History</h3>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {cashCountHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No historical cash counts found.</div>
            ) : (
              cashCountHistory.map(c => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{c.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      c.status === 'SHORTAGE' ? 'bg-rose-100 text-rose-700' : c.status === 'EXCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="text-slate-500 flex justify-between">
                    <span>Expected: {formatCurrency(c.expectedClosingCash, organization.currency)}</span>
                    <span>Actual: {formatCurrency(c.actualPhysicalCash, organization.currency)}</span>
                  </div>

                  {c.explanation && (
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic border border-slate-200 dark:border-slate-700">
                      "{c.explanation}"
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between">
                    <span>Officer: {c.personResponsible}</span>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
