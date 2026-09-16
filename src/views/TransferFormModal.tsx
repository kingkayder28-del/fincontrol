import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Organization, User, Transfer } from '../types';
import {
  getStore,
  saveStore,
  generateTransferNumber,
  logAudit,
  formatCurrency,
  calculateAccountBalance
} from '../lib/storage';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  currentUser: User;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentUser
}) => {
  if (!isOpen) return null;

  const store = getStore();
  const orgId = organization.id;
  const orgAccounts = store.accounts.filter(a => a.orgId === orgId && a.status === 'active');

  const autoTrfNo = generateTransferNumber(orgId);
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTime);
  const [fromAccountId, setFromAccountId] = useState(orgAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(orgAccounts[1]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [feeAmount, setFeeAmount] = useState<number | ''>(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      return setErrorMsg('Source and Destination accounts must be different.');
    }
    if (!amount || Number(amount) <= 0) {
      return setErrorMsg('Transfer amount must be greater than zero.');
    }
    if (!description.trim()) {
      return setErrorMsg('Description is required.');
    }

    const numAmount = Number(amount);
    const numFee = Number(feeAmount || 0);

    const fromAcc = store.accounts.find(a => a.id === fromAccountId);
    const availableBalance = fromAcc ? calculateAccountBalance(orgId, fromAcc.id) : 0;
    if (fromAcc && availableBalance < (numAmount + numFee)) {
      return setErrorMsg(`Insufficient funds in ${fromAcc.name}. Available balance: ${formatCurrency(availableBalance, organization.currency)}`);
    }

    const newTransfer: Transfer = {
      id: `trf-${Date.now()}`,
      orgId,
      transferNumber: autoTrfNo,
      date,
      time,
      fromAccountId,
      toAccountId,
      amount: numAmount,
      feeAmount: numFee,
      referenceNo: referenceNo.trim() || undefined,
      description: description.trim(),
      recordedByUserId: currentUser.id,
      recordedByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    store.transfers.unshift(newTransfer);

    // Update source and target balances
    if (fromAcc) fromAcc.currentBalance -= (numAmount + numFee);
    const toAcc = store.accounts.find(a => a.id === toAccountId);
    if (toAcc) toAcc.currentBalance += numAmount;

    saveStore(store);
    logAudit(
      'TRANSFER_CREATED',
      'Transfers',
      `Executed ${autoTrfNo}: Transferred ${formatCurrency(numAmount, organization.currency)} from ${fromAcc?.name} to ${toAcc?.name}`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Inter-Account Transfer</h2>
              <div className="text-xs text-slate-500 font-mono">Auto Number: <span className="font-bold text-blue-600 dark:text-blue-400">{autoTrfNo}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">From Account (Source)</label>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {orgAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(calculateAccountBalance(orgId, a.id), organization.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Account (Destination)</label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {orgAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(calculateAccountBalance(orgId, a.id), organization.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Amount ({organization.currency.code}) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Fee / Bank Charge</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={feeAmount}
                onChange={e => setFeeAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cash replenishment for petty office..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Reference / Withdrawal Ref #</label>
            <input
              type="text"
              placeholder="Reference number"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-colors"
            >
              Execute Transfer
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
