import React, { useState } from 'react';
import { CheckCircle2, Building2, Calendar, FileCheck, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Organization, User, Account, BankReconciliation } from '../types';
import { getStore, saveStore, formatCurrency, logAudit } from '../lib/storage';

interface BankReconciliationViewProps {
  organization: Organization;
  currentUser: User;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const bankAccounts = store.accounts.filter(a => a.orgId === orgId && (a.type === 'bank' || a.type === 'mobile_money'));
  const [selectedAccountId, setSelectedAccountId] = useState(bankAccounts[0]?.id || '');

  const todayStr = new Date().toISOString().split('T')[0];
  const [statementDate, setStatementDate] = useState(todayStr);
  const [statementEndingBalance, setStatementEndingBalance] = useState<number | ''>('');

  const targetAccount = bankAccounts.find(a => a.id === selectedAccountId) || bankAccounts[0];

  // Get transactions for selected account
  const accountReceipts = store.receipts.filter(r => r.orgId === orgId && r.accountId === targetAccount?.id);
  const accountPayments = store.payments.filter(p => p.orgId === orgId && p.accountId === targetAccount?.id && (p.status === 'approved' || p.status === 'paid'));

  const accountTxns = [
    ...accountReceipts.map(r => ({ ...r, txnKind: 'deposit' as const })),
    ...accountPayments.map(p => ({ ...p, txnKind: 'withdrawal' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Track checked / matched transaction IDs
  const [reconciledTxnIds, setReconciledTxnIds] = useState<string[]>([]);

  const handleToggleTxn = (id: string) => {
    if (reconciledTxnIds.includes(id)) {
      setReconciledTxnIds(reconciledTxnIds.filter(i => i !== id));
    } else {
      setReconciledTxnIds([...reconciledTxnIds, id]);
    }
  };

  // Calculations
  const openingBal = targetAccount ? targetAccount.openingBalance : 0;
  const totalReconciledDeposits = accountReceipts
    .filter(r => reconciledTxnIds.includes(r.id))
    .reduce((sum, r) => sum + r.amount, 0);

  const totalReconciledWithdrawals = accountPayments
    .filter(p => reconciledTxnIds.includes(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  const appCalculatedBalance = openingBal + totalReconciledDeposits - totalReconciledWithdrawals;
  const statementBalNum = Number(statementEndingBalance || 0);

  const difference = statementBalNum - appCalculatedBalance;
  const isBalanced = Math.abs(difference) < 0.01 && statementEndingBalance !== '';

  const handleFinalizeReconciliation = () => {
    if (statementEndingBalance === '') {
      return alert('Please enter Bank Statement Ending Balance.');
    }

    const newRecon: BankReconciliation = {
      id: `recon-${Date.now()}`,
      orgId,
      accountId: targetAccount.id,
      reconciliationDate: todayStr,
      statementDate,
      statementEndingBalance: statementBalNum,
      appCalculatedBalance,
      difference,
      status: isBalanced ? 'balanced' : 'unbalanced',
      reconciledTransactionIds: reconciledTxnIds,
      completedBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    store.reconciliations.unshift(newRecon);
    saveStore(store);
    logAudit(
      'BANK_RECONCILIATION_COMPLETED',
      'Bank Control',
      `Completed bank reconciliation for ${targetAccount.name}. Statement Bal: ${formatCurrency(statementBalNum, organization.currency)}. Status: ${newRecon.status}`
    );

    alert(`Bank Reconciliation finalized permanently! Status: ${isBalanced ? 'BALANCED' : 'UNBALANCED VARIANCE DETECTED'}`);
  };

  const reconHistory = store.reconciliations.filter(r => r.orgId === orgId);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span>Bank & Wallet Statement Reconciliation</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Match physical bank statement line items against internal records to detect unrecorded bank charges, interest & deposits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Reconciliation Workspace */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-bold text-slate-500 mb-1">Select Bank Account</label>
              <select
                value={selectedAccountId}
                onChange={e => {
                  setSelectedAccountId(e.target.value);
                  setReconciledTxnIds([]);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.bankOrProviderName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Statement Ending Date</label>
              <input
                type="date"
                value={statementDate}
                onChange={e => setStatementDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Bank Statement Ending Bal ({organization.currency.code}) *</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={statementEndingBalance}
                onChange={e => setStatementEndingBalance(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Variance Calculation Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase">Reconciliation Balance Variance</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {isBalanced ? 'BALANCED' : 'UNBALANCED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-800/80">
                <div className="text-[10px] text-slate-400">Statement Ending</div>
                <div className="font-bold">{formatCurrency(statementBalNum, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80">
                <div className="text-[10px] text-emerald-400">Reconciled Deposits</div>
                <div className="font-bold text-emerald-400">+{formatCurrency(totalReconciledDeposits, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80">
                <div className="text-[10px] text-rose-400">Reconciled Withdrawals</div>
                <div className="font-bold text-rose-400">-{formatCurrency(totalReconciledWithdrawals, organization.currency)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80">
                <div className="text-[10px] text-slate-400">Variance Difference</div>
                <div className={`font-extrabold ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(difference, organization.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Checklist of Transactions to Reconcile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Select Statement Cleared Transactions ({reconciledTxnIds.length} / {accountTxns.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (reconciledTxnIds.length === accountTxns.length) setReconciledTxnIds([]);
                  else setReconciledTxnIds(accountTxns.map(t => t.id));
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {reconciledTxnIds.length === accountTxns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl p-2">
              {accountTxns.map(t => {
                const isChecked = reconciledTxnIds.includes(t.id);
                const isDep = t.txnKind === 'deposit';
                const num = (t as any).receiptNumber || (t as any).paymentNumber;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTxn(t.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors text-xs ${
                      isChecked
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="font-mono text-slate-500">{num}</span>
                          <span>•</span>
                          <span>{(t as any).receivedFrom || (t as any).payee}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{t.date} - {t.description}</div>
                      </div>
                    </div>

                    <div className={`font-bold ${isDep ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isDep ? '+' : '-'}{formatCurrency(t.amount, organization.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleFinalizeReconciliation}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors"
          >
            Lock & Finalize Reconciliation
          </button>

        </div>

        {/* Right Column: Historical Reconciliations */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Permanent Reconciliation History</h3>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {reconHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No completed bank reconciliations found.</div>
            ) : (
              reconHistory.map(r => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Date: {r.statementDate}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${r.status === 'balanced' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Statement: {formatCurrency(r.statementEndingBalance, organization.currency)}</span>
                    <span>Diff: {formatCurrency(r.difference, organization.currency)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                    Officer: {r.completedBy}
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
