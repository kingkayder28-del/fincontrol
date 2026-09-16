import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Eye,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react';
import { Organization, User, Receipt as ReceiptType, Payment as PaymentType, Transfer as TransferType } from '../types';
import { getStore, saveStore, formatCurrency, logAudit } from '../lib/storage';
import { exportReportToPDF } from '../lib/pdfExport';
import { exportToExcel, exportToCSV } from '../lib/excelExport';

interface TransactionsViewProps {
  organization: Organization;
  currentUser: User;
  onOpenQuickAdd: (defaultTab?: string) => void;
  initialFilterMonth?: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  organization,
  currentUser,
  onOpenQuickAdd,
  initialFilterMonth
}) => {
  const store = getStore();
  const orgId = organization.id;

  const [activeTab, setActiveTab] = useState<'all' | 'receipts' | 'payments' | 'transfers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'this_month' | 'this_year'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  // Transaction detail drawer state
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [selectedTxnType, setSelectedTxnType] = useState<'receipt' | 'payment' | 'transfer'>('receipt');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const receipts = store.receipts.filter(r => r.orgId === orgId);
  const payments = store.payments.filter(p => p.orgId === orgId);
  const transfers = store.transfers.filter(t => t.orgId === orgId);
  const accounts = store.accounts.filter(a => a.orgId === orgId);
  const categories = store.categories.filter(c => c.orgId === orgId);

  // Combine for 'all' tab
  let allTxns = [
    ...receipts.map(r => ({ ...r, txnType: 'receipt' as const, sortDate: r.createdAt })),
    ...payments.map(p => ({ ...p, txnType: 'payment' as const, sortDate: p.createdAt })),
    ...transfers.map(t => ({ ...t, txnType: 'transfer' as const, sortDate: t.createdAt }))
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  // Filter logic
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);
  const thisYearStr = todayStr.substring(0, 4);

  const applyFilters = (items: any[]) => {
    return items.filter(item => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = (item.receiptNumber || item.paymentNumber || item.transferNumber || '').toLowerCase();
        const party = (item.receivedFrom || item.payee || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const ref = (item.referenceNo || '').toLowerCase();
        const match = num.includes(q) || party.includes(q) || desc.includes(q) || ref.includes(q);
        if (!match) return false;
      }

      // Date Range
      if (dateRange === 'today' && item.date !== todayStr) return false;
      if (dateRange === 'this_month' && !item.date.startsWith(thisMonthStr)) return false;
      if (dateRange === 'this_year' && !item.date.startsWith(thisYearStr)) return false;

      // Account
      if (selectedAccountId !== 'all') {
        if (item.accountId && item.accountId !== selectedAccountId) return false;
        if (item.fromAccountId && item.fromAccountId !== selectedAccountId && item.toAccountId !== selectedAccountId) return false;
      }

      // Category
      if (selectedCategoryId !== 'all' && item.categoryId && item.categoryId !== selectedCategoryId) return false;

      return true;
    });
  };

  const filteredReceipts = applyFilters(receipts);
  const filteredPayments = applyFilters(payments);
  const filteredTransfers = applyFilters(transfers);
  const filteredAll = applyFilters(allTxns);

  // Voiding Handler
  const handleVoidTransaction = () => {
    if (!voidReason.trim()) return alert('Please provide a reason for voiding this transaction.');
    if (!selectedTxn) return;

    if (selectedTxnType === 'payment') {
      const p = store.payments.find(pay => pay.id === selectedTxn.id);
      if (p) {
        p.status = 'voided';
        p.voidedByUserId = currentUser.id;
        p.voidedByName = currentUser.name;
        p.voidedAt = new Date().toISOString();
        p.voidReason = voidReason;

        // Revert account balance
        const acc = store.accounts.find(a => a.id === p.accountId);
        if (acc) acc.currentBalance += p.amount;

        saveStore(store);
        logAudit('PAYMENT_VOIDED', 'Payments', `Voided ${p.paymentNumber} for reason: ${voidReason}`);
      }
    }

    setVoidModalOpen(false);
    setSelectedTxn(null);
  };

  // Export List Utility
  const handleExportList = (format: 'pdf' | 'excel' | 'csv') => {
    const listToExport = activeTab === 'receipts' ? filteredReceipts : activeTab === 'payments' ? filteredPayments : filteredAll;

    const headers = ['Ref Number', 'Date', 'Type', 'Party / Payee', 'Category', 'Account', 'Amount', 'Status'];
    const rows = listToExport.map(item => {
      const isRcpt = item.txnType === 'receipt' || !!item.receiptNumber;
      const isPay = item.txnType === 'payment' || !!item.paymentNumber;
      const num = item.receiptNumber || item.paymentNumber || item.transferNumber;
      const party = item.receivedFrom || item.payee || 'Internal Transfer';
      const cat = categories.find(c => c.id === item.categoryId)?.name || 'General';
      const acc = accounts.find(a => a.id === item.accountId)?.name || 'Account';
      const status = item.status || 'recorded';

      return [
        num,
        item.date,
        isRcpt ? 'RECEIPT' : isPay ? 'PAYMENT' : 'TRANSFER',
        party,
        cat,
        acc,
        formatCurrency(item.amount, organization.currency),
        status.toUpperCase()
      ];
    });

    if (format === 'pdf') {
      exportReportToPDF({
        organization,
        reportTitle: `Transaction History Listing (${activeTab.toUpperCase()})`,
        generatedBy: currentUser.name,
        headers,
        rows
      });
    } else if (format === 'excel') {
      exportToExcel(`transactions_${activeTab}_${todayStr}`, headers, rows);
    } else {
      exportToCSV(`transactions_${activeTab}_${todayStr}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Financial Transactions Listing</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-backed receipts, payments & inter-account transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportList('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => handleExportList('excel')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={() => onOpenQuickAdd()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter & Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Transactions ({allTxns.length})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'receipts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Receipts ({receipts.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'transfers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Transfers ({transfers.length})
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference #, payee, vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <div>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Party / Payee</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAll.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredAll.map(t => {
                  const isRcpt = t.txnType === 'receipt' || !!t.receiptNumber;
                  const isPay = t.txnType === 'payment' || !!t.paymentNumber;
                  const num = t.receiptNumber || t.paymentNumber || t.transferNumber;
                  const party = t.receivedFrom || t.payee || 'Internal Transfer';
                  const accountObj = accounts.find(a => a.id === t.accountId);
                  const status = t.status || 'recorded';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {isRcpt ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : isPay ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <span>{num}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{t.date}</div>
                        <div className="text-[10px] text-slate-400">{t.time || '00:00'}</div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[160px] truncate">
                        {party}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                        {t.description}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {accountObj ? accountObj.name : 'Account'}
                      </td>

                      <td className={`py-3 px-4 font-bold text-right text-xs ${
                        isRcpt ? 'text-emerald-600 dark:text-emerald-400' : isPay ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {isRcpt ? '+' : isPay ? '-' : ''}{formatCurrency(t.amount, organization.currency)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          status === 'approved' || status === 'paid' || status === 'recorded'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : status === 'pending_approval'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : status === 'voided'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 line-through'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700'
                        }`}>
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTxn(t);
                            setSelectedTxnType(isRcpt ? 'receipt' : isPay ? 'payment' : 'transfer');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Voucher & Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Voucher Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Financial Transaction Voucher
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {selectedTxn.receiptNumber || selectedTxn.paymentNumber || selectedTxn.transferNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedTxn(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-slate-500">Amount:</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(selectedTxn.amount, organization.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">Date:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedTxn.date}</strong></div>
                <div><span className="text-slate-400">Method:</span> <strong className="text-slate-800 dark:text-slate-200 uppercase">{selectedTxn.paymentMethod || 'Transfer'}</strong></div>
                <div><span className="text-slate-400">Party/Payee:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedTxn.receivedFrom || selectedTxn.payee || 'Internal'}</strong></div>
                <div><span className="text-slate-400">Recorded By:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedTxn.recordedByName}</strong></div>
              </div>

              <div>
                <span className="text-slate-400">Purpose / Description:</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedTxn.description}</p>
              </div>

              {selectedTxn.voidReason && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300">
                  <strong>Void Reason:</strong> {selectedTxn.voidReason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {selectedTxnType === 'payment' && selectedTxn.status !== 'voided' && (
                <button
                  onClick={() => setVoidModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-200"
                >
                  <Ban className="w-4 h-4" />
                  <span>Void Transaction</span>
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Void Financial Transaction</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Financial records are permanently retained in the audit trail. Voiding will cancel the transaction, revert balances, and lock the record with your reason.
            </p>
            <textarea
              rows={3}
              required
              placeholder="Enter audit reason for voiding this payment..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setVoidModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidTransaction}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
