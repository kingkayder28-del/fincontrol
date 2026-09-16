import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  Building2,
  CheckCircle2,
  Clock,
  FolderGit2,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  HelpCircle,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Boxes
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUserRole: string;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  pendingApprovalsCount: number;
  orgThemeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUserRole,
  collapsed,
  setCollapsed,
  pendingApprovalsCount,
  orgThemeColor = '#3b82f6'
}) => {
  const navItems = [
    { id: 'organizations', label: 'My Organizations', icon: Building2 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'cash-control', label: 'Cash Control', icon: Calculator },
    { id: 'accounts', label: 'Accounts & Wallets', icon: Wallet },
    { id: 'bank-reconciliation', label: 'Bank Reconciliation', icon: CheckCircle2 },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: Clock,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    { id: 'projects', label: 'Projects & Funds', icon: FolderGit2 },
    { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet },
    ...(currentUserRole === 'admin' ? [{ id: 'profit-analysis', label: 'Profit Analysis', icon: TrendingUp }] : []),
    { id: 'tax-obligations', label: 'Tax Obligations', icon: TrendingUp },
    { id: 'audit-trail', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'tutorial', label: 'Tutorial', icon: BookOpen },
    { id: 'help', label: 'Help Centre', icon: HelpCircle },
    { id: 'about', label: 'About', icon: Sparkles }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-slate-950 text-slate-300 transition-all duration-200 border-r border-slate-800 shrink-0 z-20 ${
        collapsed ? 'w-16 h-screen' : 'w-64 h-screen'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white shadow-sm">
              LN
            </div>
            <div>
              <div className="font-semibold text-white text-sm tracking-tight leading-none">LedgerNest</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Enterprise</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
            LN
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'font-semibold text-white border border-white/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
              style={isActive ? { backgroundColor: orgThemeColor } : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"></span>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="m-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-200">Compliance & security</div>
          <div className="mt-1 leading-relaxed text-slate-400">
            Encrypted tenant controls and audit trace remain active.
          </div>
        </div>
      )}
    </aside>
  );
};
