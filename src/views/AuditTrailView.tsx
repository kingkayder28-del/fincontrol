import React, { useState } from 'react';
import { ShieldAlert, Search, Download, Filter, FileText } from 'lucide-react';
import { Organization, User } from '../types';
import { getStore, formatCurrency } from '../lib/storage';
import { exportReportToPDF } from '../lib/pdfExport';
import { exportToExcel } from '../lib/excelExport';

interface AuditTrailViewProps {
  organization: Organization;
  currentUser: User;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const auditLogs = store.auditLogs.filter(a => a.orgId === orgId);

  const filteredLogs = auditLogs.filter(log => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (moduleFilter !== 'all' && log.module.toLowerCase() !== moduleFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleExportAuditPDF = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.userName,
      l.userRole,
      l.action,
      l.module,
      l.details
    ]);

    exportReportToPDF({
      organization,
      reportTitle: 'Immutable System Audit Trail Log',
      generatedBy: currentUser.name,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>Immutable System Security & Financial Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tamper-proof event logs recording all financial transactions, approvals, voidings & reconciliation actions.
          </p>
        </div>

        <button
          onClick={handleExportAuditPDF}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log (PDF)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit logs by user, action, or keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
        >
          <option value="all">All Audit Modules</option>
          <option value="receipts">Receipts</option>
          <option value="payments">Payments</option>
          <option value="transfers">Transfers</option>
          <option value="cash control">Cash Control</option>
          <option value="bank control">Bank Control</option>
          <option value="approvals">Approvals</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Audit Action Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 font-mono text-[11px]">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <div>{log.userName}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">{log.userRole}</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                    {log.module}
                  </td>

                  <td className="py-3 px-4 font-sans text-slate-800 dark:text-slate-200">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
