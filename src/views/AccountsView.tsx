import React, { useState } from 'react';
import { Wallet, Building2, Phone, Plus, CreditCard, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Organization, User, Account } from '../types';
import { getStore, saveStore, formatCurrency, logAudit, calculateAccountBalance } from '../lib/storage';

interface AccountsViewProps {
  organization: Organization;
  currentUser: User;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const [accounts, setAccounts] = useState<Account[]>(store.accounts.filter(a => a.orgId === orgId));
  const [modalOpen, setModalOpen] = useState(false);

  // New account form
  const [name, setName] = useState('');
  const [type, setType] = useState<'cash' | 'bank' | 'mobile_money'>('bank');
  const [accountNo, setAccountNo] = useState('');
  const [providerName, setProviderName] = useState('');
  const [openingBal, setOpeningBal] = useState<number | ''>('');

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Account name required.');

    const newAcc: Account = {
      id: `acct-${Date.now()}`,
      orgId,
      name: name.trim(),
      type,
      accountNoIdentifier: accountNo.trim() || 'N/A',
      bankOrProviderName: providerName.trim() || undefined,
      currency: organization.currency.code,
      openingBalance: Number(openingBal || 0),
      currentBalance: Number(openingBal || 0),
      status: 'active'
    };

    store.accounts.push(newAcc);
    saveStore(store);
    logAudit('ACCOUNT_CREATED', 'Accounts', `Created ${type} account ${name}`);
    setAccounts([...store.accounts.filter(a => a.orgId === orgId)]);

    setName('');
    setAccountNo('');
    setProviderName('');
    setOpeningBal('');
    setModalOpen(false);
  };

  const cashAccounts = accounts.filter(a => a.type === 'cash');
  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const mobileAccounts = accounts.filter(a => a.type === 'mobile_money');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            <span>Financial Accounts & Mobile Money Wallets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage petty cash offices, institutional bank accounts & mobile money wallets
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Account Categories Sections */}
      <div className="space-y-6">
        
        {/* Bank Accounts */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Bank Accounts ({bankAccounts.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(a => (
              <div key={a.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">{a.bankOrProviderName || 'Bank'}</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{a.name}</h4>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">Acct #: {a.accountNoIdentifier}</div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active"></span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-400">Opening: {formatCurrency(a.openingBalance, organization.currency)}</div>
                    <div className="text-xs font-semibold text-slate-500">Live Calculated Balance</div>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculateAccountBalance(orgId, a.id), organization.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Money Accounts */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Phone className="w-4 h-4 text-purple-600" />
            <span>Mobile Money Merchant Wallets ({mobileAccounts.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mobileAccounts.map(a => (
              <div key={a.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">{a.bankOrProviderName || 'Mobile Money'}</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{a.name}</h4>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">Wallet: {a.accountNoIdentifier}</div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active"></span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-400">Opening: {formatCurrency(a.openingBalance, organization.currency)}</div>
                    <div className="text-xs font-semibold text-slate-500">Live Calculated Balance</div>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculateAccountBalance(orgId, a.id), organization.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Offices */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Petty Cash Offices ({cashAccounts.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashAccounts.map(a => (
              <div key={a.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Cash Office</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{a.name}</h4>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">Code: {a.accountNoIdentifier}</div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active"></span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-400">Opening: {formatCurrency(a.openingBalance, organization.currency)}</div>
                    <div className="text-xs font-semibold text-slate-500">Live Calculated Balance</div>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculateAccountBalance(orgId, a.id), organization.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Add Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Account</h3>
            
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Bank Operations Account"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Account Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="bank">Bank Account</option>
                  <option value="mobile_money">Mobile Money Wallet</option>
                  <option value="cash">Petty Cash Office</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Bank / Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Bank, Airtel Money..."
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Account Identifier / Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1002938475"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Opening Balance ({organization.currency.code})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={openingBal}
                  onChange={e => setOpeningBal(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
