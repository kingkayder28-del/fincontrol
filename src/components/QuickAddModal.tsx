import React from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Calculator, ArrowRightLeft, ShieldCheck, Plus } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'receipt' | 'payment' | 'cash-count' | 'transfer') => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'receipt' as const,
      title: 'New Receipt',
      desc: 'Record money received into cash, bank or mobile wallet',
      icon: ArrowDownLeft,
      color: 'bg-emerald-500 text-white shadow-emerald-500/30',
      border: 'hover:border-emerald-500/50'
    },
    {
      id: 'payment' as const,
      title: 'New Payment',
      desc: 'Record money paid out to suppliers, staff or expenses',
      icon: ArrowUpRight,
      color: 'bg-rose-500 text-white shadow-rose-500/30',
      border: 'hover:border-rose-500/50'
    },
    {
      id: 'cash-count' as const,
      title: 'Daily Cash Count',
      desc: 'Perform physical petty cash count & calculate shortages',
      icon: Calculator,
      color: 'bg-amber-500 text-white shadow-amber-500/30',
      border: 'hover:border-amber-500/50'
    },
    {
      id: 'transfer' as const,
      title: 'Inter-Account Transfer',
      desc: 'Move funds between Bank, Cash and Mobile Money',
      icon: ArrowRightLeft,
      color: 'bg-blue-500 text-white shadow-blue-500/30',
      border: 'hover:border-blue-500/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Quick Actions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select transaction or record type to create</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  onSelectAction(act.id);
                  onClose();
                }}
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all text-left group shadow-xs ${act.border}`}
              >
                <div className={`w-10 h-10 rounded-xl ${act.color} flex items-center justify-center font-bold shadow-md shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {act.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {act.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
