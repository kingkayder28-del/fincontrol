import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  FileSpreadsheet,
  Menu,
  Calculator,
  ArrowRightLeft,
  Clock,
  Settings,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenQuickAdd: (defaultTab?: string) => void;
  onOpenMoreMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onNavigate,
  onOpenQuickAdd,
  onOpenMoreMenu
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 pb-safe shadow-2xl">
      <div className="flex items-center justify-around">
        
        {/* Home */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </button>

        {/* Transactions */}
        <button
          onClick={() => onNavigate('transactions')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition-colors ${
            currentView === 'transactions'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span>Txns</span>
        </button>

        {/* Big Add Floating Button */}
        <button
          onClick={() => onOpenQuickAdd()}
          className="-mt-5 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border-2 border-white dark:border-slate-900 transition-all"
          title="Quick Action"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Reports */}
        <button
          onClick={() => onNavigate('reports')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition-colors ${
            currentView === 'reports'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Reports</span>
        </button>

        {/* More */}
        <button
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl text-[10px] font-medium transition-colors ${
            ['accounts', 'cash-control', 'approvals', 'settings', 'help', 'tutorial'].includes(currentView)
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>

      </div>
    </nav>
  );
};
