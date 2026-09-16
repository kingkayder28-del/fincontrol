import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ShieldAlert,
  UserCheck,
  BookOpen,
  LogOut,
  HelpCircle,
  Settings,
  Sparkles,
  DollarSign,
  ArrowRightLeft,
  Calculator,
  Palette
} from 'lucide-react';
import { Organization, User } from '../types';
import { formatCurrency, getStore, saveStore, logAudit } from '../lib/storage';
import { QuickOrgSwitcher } from './QuickOrgSwitcher';

interface HeaderProps {
  organization: Organization;
  organizations: Organization[];
  currentUser: User;
  onOpenSearch: () => void;
  onOpenQuickAdd: (defaultTab?: string) => void;
  onOpenNotifications: () => void;
  onNavigate: (view: string) => void;
  onSwitchOrganization: (org: Organization) => void;
  onCreateOrganization: () => void;
  onOpenSetupWizard?: () => void;
  onLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  organization,
  organizations,
  currentUser,
  onOpenSearch,
  onOpenQuickAdd,
  onOpenNotifications,
  onNavigate,
  onSwitchOrganization,
  onCreateOrganization,
  onLogout,
  darkMode,
  setDarkMode,
  unreadNotificationsCount
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const store = getStore();

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    finance_manager: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    accounts_user: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    data_entry: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    approver: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    auditor: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    viewer: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur-sm transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <QuickOrgSwitcher
            organizations={organizations}
            activeOrg={organization}
            onSelectOrg={onSwitchOrganization}
            onCreateNew={onCreateOrganization}
          />
        </div>

        <div className="hidden max-w-md flex-1 md:block">
          <button
            onClick={onOpenSearch}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <span>Search receipts, payments, suppliers, categories...</span>
            </div>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 lg:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 border-r border-slate-200 pr-2 lg:flex">
            <button
              onClick={() => onOpenQuickAdd('receipt')}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Receipt</span>
            </button>
            <button
              onClick={() => onOpenQuickAdd('payment')}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Payment</span>
            </button>
            <button
              onClick={() => onNavigate('cash-control')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Cash count</span>
            </button>
          </div>

          <button
            onClick={onOpenSearch}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenNotifications}
            className="relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden text-left xl:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
                <div className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${roleColors[currentUser.role]}`}>
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="mb-1 border-b border-slate-200 px-3 py-2.5">
                  <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{currentUser.email}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <UserCheck className="h-3 w-3" />
                    <span>Role: {currentUser.role.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-xs">
                  <button
                    onClick={() => { setUserMenuOpen(false); onNavigate('settings'); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Account & security settings</span>
                  </button>

                  <button
                    onClick={() => { setUserMenuOpen(false); onNavigate('tutorial'); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                  >
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span>Guided tutorial</span>
                  </button>

                  <button
                    onClick={() => { setUserMenuOpen(false); onNavigate('help'); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    <span>Help centre & support</span>
                  </button>

                  <button
                    onClick={() => { setUserMenuOpen(false); onNavigate('about'); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span>About LedgerNest</span>
                  </button>

                  <div className="mt-1 border-t border-slate-200 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
