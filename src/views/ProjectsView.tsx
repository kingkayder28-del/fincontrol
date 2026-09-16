import React, { useState } from 'react';
import { FolderGit2, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2, Building2 } from 'lucide-react';
import { Organization, User, ProjectFund } from '../types';
import { getStore, saveStore, formatCurrency, logAudit } from '../lib/storage';

interface ProjectsViewProps {
  organization: Organization;
  currentUser: User;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const [projects, setProjects] = useState<ProjectFund[]>(store.projects.filter(p => p.orgId === orgId));
  const [modalOpen, setModalOpen] = useState(false);

  // New project state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'project' | 'fund' | 'grant' | 'donor_budget'>('project');
  const [donorName, setDonorName] = useState('');
  const [totalBudget, setTotalBudget] = useState<number | ''>('');

  const receipts = store.receipts.filter(r => r.orgId === orgId);
  const payments = store.payments.filter(p => p.orgId === orgId && p.status !== 'voided');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Project name is required.');

    const newProj: ProjectFund = {
      id: `proj-${Date.now()}`,
      orgId,
      name: name.trim(),
      code: code.trim() || `PROJ-${Date.now()}`,
      type,
      donorName: donorName.trim() || undefined,
      totalBudget: Number(totalBudget || 0),
      status: 'active'
    };

    store.projects.push(newProj);
    saveStore(store);
    logAudit('PROJECT_CREATED', 'Projects', `Created ${type} ${name} with budget ${totalBudget}`);

    setProjects([...store.projects.filter(p => p.orgId === orgId)]);
    setName('');
    setCode('');
    setDonorName('');
    setTotalBudget('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-purple-600" />
            <span>Projects, Funds & Donor Grant Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Budget vs Actuals tracking for donor grants, restricted funds, departments & program activities.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Project / Grant</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => {
          const receivedAmount = receipts
            .filter(r => r.projectFundId === p.id)
            .reduce((sum, r) => sum + r.amount, 0);

          const spentAmount = payments
            .filter(pay => pay.projectFundId === p.id && (pay.status === 'approved' || pay.status === 'paid'))
            .reduce((sum, pay) => sum + pay.amount, 0);

          const remainingBudget = p.totalBudget - spentAmount;
          const pctSpent = p.totalBudget > 0 ? Math.min(100, Math.round((spentAmount / p.totalBudget) * 100)) : 0;

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                    {p.code} • {p.type.toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                    {p.name}
                  </h3>
                  {p.donorName && (
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      Donor: <strong className="text-slate-800 dark:text-slate-200">{p.donorName}</strong>
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                  {p.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Budget Utilization ({pctSpent}%)</span>
                  <span className="text-slate-900 dark:text-slate-100">{formatCurrency(spentAmount, organization.currency)} / {formatCurrency(p.totalBudget, organization.currency)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pctSpent > 90 ? 'bg-rose-500' : pctSpent > 70 ? 'bg-amber-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${pctSpent}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[10px] text-slate-400">Total Budget</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(p.totalBudget, organization.currency)}</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <div className="text-[10px] text-emerald-600">Grant Received</div>
                  <div className="font-bold text-emerald-600">+{formatCurrency(receivedAmount, organization.currency)}</div>
                </div>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40">
                  <div className="text-[10px] text-purple-600">Remaining</div>
                  <div className="font-bold text-purple-600">{formatCurrency(remainingBudget, organization.currency)}</div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Project / Grant</h3>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rural Water & Sanitation Project"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Project / Grant Code</label>
                <input
                  type="text"
                  placeholder="e.g. PROJ-2026-RWSP"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Donor / Funding Source</label>
                <input
                  type="text"
                  placeholder="e.g. Global Water Foundation, USAID..."
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Total Approved Budget ({organization.currency.code})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={totalBudget}
                  onChange={e => setTotalBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
