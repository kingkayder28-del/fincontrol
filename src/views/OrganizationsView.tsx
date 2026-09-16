import React from 'react';
import { ArrowRight, Bell, Building2, ClipboardCheck, Plus, ShieldCheck } from 'lucide-react';
import { Organization, User } from '../types';
import { calculateFinancialSummary, formatCurrency, getStore } from '../lib/storage';

interface OrganizationsViewProps {
  organizations: Organization[];
  currentUser: User;
  onOpenWorkspace: (organization: Organization) => void;
  onCreateOrganization: () => void;
  onDeleteOrganization: (organization: Organization) => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({
  organizations,
  currentUser,
  onOpenWorkspace,
  onCreateOrganization,
  onDeleteOrganization
}) => {
  const store = getStore();
  const unreadCount = store.notifications.filter(notification => !notification.isRead).length;
  const activeOrganizations = organizations.filter(organization => organization.status === 'active');

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            <ShieldCheck className="h-4 w-4 text-slate-200" />
            Administrator workspace
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">Good morning, {currentUser.name.split(' ')[0]}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
            You currently manage {activeOrganizations.length} {activeOrganizations.length === 1 ? 'organization' : 'organizations'}. Choose the workspace that needs your attention today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-slate-200">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Building2 className="h-4 w-4 text-slate-200" />
              {activeOrganizations.length} active workspace{activeOrganizations.length === 1 ? '' : 's'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Bell className="h-4 w-4 text-slate-200" />
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace directory</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">My organizations</h2>
        </div>
        <button
          onClick={onCreateOrganization}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add organization
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {organizations.map(organization => {
          const summary = calculateFinancialSummary(organization.id);
          const unreadForOrg = store.notifications.filter(notification => notification.orgId === organization.id && !notification.isRead).length;
          const initials = organization.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();

          return (
            <article key={organization.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: organization.themeColor || '#2563eb' }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-900">{organization.name}</h3>
                    <p className="text-xs text-slate-500">{organization.type} · {organization.currency.code}</p>
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${organization.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span className={`h-2 w-2 rounded-full ${organization.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {organization.status === 'active' ? 'Ready' : 'Setup pending'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Cash</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(summary.totalCashBalance, organization.currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pending</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{summary.pendingApprovalsCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Alerts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{unreadForOrg}</p>
                </div>
              </div>

              <button
                onClick={() => onOpenWorkspace(organization)}
                disabled={organization.status !== 'active'}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: organization.themeColor || '#2563eb' }}
              >
                Open {organization.name} workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => onDeleteOrganization(organization)}
                  className="mt-2 w-full rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  Archive data & delete workspace
                </button>
              )}
            </article>
          );
        })}
      </div>

      {organizations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Your workspace directory is empty.</p>
          <button onClick={onCreateOrganization} className="mt-4 text-xs font-semibold text-blue-600">Create your first organization</button>
        </div>
      )}
    </div>
  );
};
