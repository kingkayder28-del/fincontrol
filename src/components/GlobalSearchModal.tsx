import React, { useState, useEffect } from 'react';
import { Search, X, Receipt, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, FileText, Calendar, Building2 } from 'lucide-react';
import { Organization, Receipt as ReceiptType, Payment as PaymentType, Transfer as TransferType } from '../types';
import { getStore, formatCurrency } from '../lib/storage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onSelectTransaction: (type: 'receipt' | 'payment' | 'transfer', item: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  organization,
  onSelectTransaction
}) => {
  const [query, setQuery] = useState('');
  const store = getStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const orgId = organization.id;
  const receipts = store.receipts.filter(r => r.orgId === orgId);
  const payments = store.payments.filter(p => p.orgId === orgId);
  const transfers = store.transfers.filter(t => t.orgId === orgId);

  const q = query.toLowerCase().trim();

  const filteredReceipts = q
    ? receipts.filter(
        r =>
          r.receiptNumber.toLowerCase().includes(q) ||
          r.receivedFrom.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.referenceNo && r.referenceNo.toLowerCase().includes(q)) ||
          r.amount.toString().includes(q)
      )
    : receipts.slice(0, 3);

  const filteredPayments = q
    ? payments.filter(
        p =>
          p.paymentNumber.toLowerCase().includes(q) ||
          p.payee.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.referenceNo && p.referenceNo.toLowerCase().includes(q)) ||
          (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
          p.amount.toString().includes(q)
      )
    : payments.slice(0, 3);

  const filteredTransfers = q
    ? transfers.filter(
        t =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      )
    : transfers.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type RCPT-2026-000001, PAY-..., supplier, donor, amount..."
            className="flex-1 bg-transparent border-0 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-6 flex-1">
          
          {/* Receipts Section */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-between">
              <span>Receipts ({filteredReceipts.length})</span>
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
            {filteredReceipts.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">No matching receipts found.</div>
            ) : (
              <div className="space-y-1.5">
                {filteredReceipts.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelectTransaction('receipt', r);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{r.receiptNumber}</span>
                        <span>•</span>
                        <span>{r.receivedFrom}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                        {r.description} ({r.date})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(r.amount, organization.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.paymentMethod.toUpperCase()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payments Section */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center justify-between">
              <span>Payments ({filteredPayments.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            {filteredPayments.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">No matching payments found.</div>
            ) : (
              <div className="space-y-1.5">
                {filteredPayments.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectTransaction('payment', p);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="text-rose-600 dark:text-rose-400 font-mono">{p.paymentNumber}</span>
                        <span>•</span>
                        <span>{p.payee}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                        {p.description} ({p.date})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(p.amount, organization.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{p.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transfers Section */}
          {filteredTransfers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center justify-between">
                <span>Transfers ({filteredTransfers.length})</span>
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1.5">
                {filteredTransfers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTransaction('transfer', t);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{t.transferNumber}</span>
                        <span>•</span>
                        <span>Internal Account Transfer</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                        {t.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(t.amount, organization.currency)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
