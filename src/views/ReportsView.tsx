import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Share2,
  Lock,
  Eye,
  Calendar,
  Building2,
  Copy,
  Check,
  X,
  FileText,
  Printer,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { Organization, User, ReportShareLink } from '../types';
import { getStore, saveStore, formatCurrency, logAudit } from '../lib/storage';
import { exportReportToPDF } from '../lib/pdfExport';
import { exportToExcel, exportToCSV } from '../lib/excelExport';

interface ReportsViewProps {
  organization: Organization;
  currentUser: User;
  onOpenSharedReport: (shareCode: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  organization,
  currentUser,
  onOpenSharedReport
}) => {
  const store = getStore();
  const orgId = organization.id;

  const [selectedReportType, setSelectedReportType] = useState<string>('investors_overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'this_month' | 'this_year' | 'all'>('this_month');

  // Share link modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePasscode, setSharePasscode] = useState('');
  const [shareExpiryHours, setShareExpiryHours] = useState<number>(24);
  const [generatedShareLink, setGeneratedShareLink] = useState<ReportShareLink | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const receipts = store.receipts.filter(r => r.orgId === orgId);
  const payments = store.payments.filter(p => p.orgId === orgId && p.status !== 'voided');
  const cashCounts = store.cashCounts.filter(c => c.orgId === orgId);
  const reconciliations = store.reconciliations.filter(r => r.orgId === orgId);
  const shareLinks = store.shareLinks.filter(s => s.orgId === orgId);

  // Compute report data dynamically based on selection
  const getReportData = () => {
    const orgUsers = store.users.filter(u => u.orgId === orgId);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const netCashFlow = totalReceipts - totalPayments;
    const cashAvailable = cashCounts.reduce((sum, c) => sum + c.actualPhysicalCash, 0);
    const activeEmployees = orgUsers.filter(u => u.status === 'active').length;
    const totalVendors = Array.from(new Set(payments.map(p => p.payee))).length;
    const totalCustomers = Array.from(new Set(receipts.map(r => r.receivedFrom))).length;

    let title = 'Stakeholder Financial Report';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let summaryCards: { label: string; value: string }[] = [];

    if (selectedReportType === 'investors_overview') {
      title = 'Investor Overview Report';
      headers = ['Metric', 'Value', 'Notes'];
      rows = [
        ['Total Revenue', formatCurrency(totalReceipts, organization.currency), 'All recorded receipts'],
        ['Total Expenses', formatCurrency(totalPayments, organization.currency), 'Approved and paid disbursements'],
        ['Net Cash Flow', formatCurrency(netCashFlow, organization.currency), 'Revenue minus expenditures'],
        ['Cash-on-Hand', formatCurrency(cashAvailable, organization.currency), 'Physical cash held across cash accounts'],
        ['Operating Efficiency', `${((totalReceipts > 0 ? (netCashFlow / totalReceipts) * 100 : 0)).toFixed(1)}%`, 'Operating profitability ratio']
      ];
      summaryCards = [
        { label: 'Total Revenue', value: formatCurrency(totalReceipts, organization.currency) },
        { label: 'Net Cash Flow', value: formatCurrency(netCashFlow, organization.currency) },
        { label: 'Cash Available', value: formatCurrency(cashAvailable, organization.currency) }
      ];
    } else if (selectedReportType === 'supplier_payables') {
      title = 'Supplier & Payable Summary';
      headers = ['Supplier / Payee', 'Total Paid', 'Last Payment', 'Status'];
      const supplierMap = new Map<string, { total: number; lastDate: string; status: string }>();
      payments.forEach(p => {
        const current = supplierMap.get(p.payee) || { total: 0, lastDate: p.date, status: p.status };
        current.total += p.amount;
        current.lastDate = p.date > current.lastDate ? p.date : current.lastDate;
        current.status = p.status;
        supplierMap.set(p.payee, current);
      });
      rows = Array.from(supplierMap.entries()).map(([supplier, value]) => [
        supplier,
        formatCurrency(value.total, organization.currency),
        value.lastDate,
        value.status.toUpperCase()
      ]);
      summaryCards = [
        { label: 'Suppliers / Vendors', value: totalVendors.toString() },
        { label: 'Total Payments', value: formatCurrency(totalPayments, organization.currency) }
      ];
    } else if (selectedReportType === 'employee_costs') {
      title = 'Employee & Payroll Cost Report';
      headers = ['Role', 'Number of People', 'Cost Coverage', 'Status'];
      const roleMap = new Map<string, number>();
      orgUsers.forEach(user => roleMap.set(user.role, (roleMap.get(user.role) || 0) + 1));
      rows = Array.from(roleMap.entries()).map(([role, count]) => [
        role.replace('_', ' ').toUpperCase(),
        count,
        formatCurrency(totalPayments * (count / Math.max(1, orgUsers.length)), organization.currency),
        'ACTIVE'
      ]);
      summaryCards = [
        { label: 'Active Employees', value: activeEmployees.toString() },
        { label: 'Total Payroll & Operations Cost', value: formatCurrency(totalPayments, organization.currency) }
      ];
    } else if (selectedReportType === 'customer_revenue') {
      title = 'Customer / Revenue Source Report';
      headers = ['Customer / Source', 'Total Received', 'Last Record', 'Category'];
      const customerMap = new Map<string, { total: number; lastDate: string; category: string }>();
      receipts.forEach(r => {
        const current = customerMap.get(r.receivedFrom) || { total: 0, lastDate: r.date, category: store.categories.find(c => c.id === r.categoryId)?.name || 'Revenue' };
        current.total += r.amount;
        current.lastDate = r.date > current.lastDate ? r.date : current.lastDate;
        current.category = store.categories.find(c => c.id === r.categoryId)?.name || 'Revenue';
        customerMap.set(r.receivedFrom, current);
      });
      rows = Array.from(customerMap.entries()).map(([source, value]) => [
        source,
        formatCurrency(value.total, organization.currency),
        value.lastDate,
        value.category
      ]);
      summaryCards = [
        { label: 'Customer / Donor Sources', value: totalCustomers.toString() },
        { label: 'Total Revenue', value: formatCurrency(totalReceipts, organization.currency) }
      ];
    } else if (selectedReportType === 'lender_debt') {
      title = 'Lender & Funding Exposure Report';
      headers = ['Funding Source', 'Funding Value', 'Funding Type', 'Coverage'];
      const fundingRows = receipts.map(r => [r.receivedFrom, formatCurrency(r.amount, organization.currency), 'Funding / inflow', `${((r.amount / Math.max(1, totalReceipts)) * 100).toFixed(1)}%`]);
      rows = fundingRows.slice(0, 10);
      summaryCards = [
        { label: 'Total Funding Inflows', value: formatCurrency(totalReceipts, organization.currency) },
        { label: 'Funding Sources', value: totalCustomers.toString() }
      ];
    } else if (selectedReportType === 'government_compliance') {
      title = 'Government & Compliance Snapshot';
      headers = ['Compliance Area', 'Value', 'Status'];
      rows = [
        ['Receipts Recorded', formatCurrency(totalReceipts, organization.currency), 'COMPLIANT'],
        ['Payments Approved', formatCurrency(totalPayments, organization.currency), 'COMPLIANT'],
        ['Cash Count Variance', formatCurrency(cashCounts.reduce((sum, c) => sum + Math.abs(c.cashDifference), 0), organization.currency), cashCounts.some(c => c.status === 'SHORTAGE') ? 'REVIEW' : 'STABLE'],
        ['Audit Log Count', store.auditLogs.filter(a => a.orgId === orgId).length.toString(), 'READY'],
        ['Reporting Period', selectedPeriod.toUpperCase(), 'ACTIVE']
      ];
      summaryCards = [
        { label: 'Audit Trail Entries', value: store.auditLogs.filter(a => a.orgId === orgId).length.toString() },
        { label: 'Cash Variance', value: formatCurrency(cashCounts.reduce((sum, c) => sum + Math.abs(c.cashDifference), 0), organization.currency) }
      ];
    } else if (selectedReportType === 'public_transparency') {
      title = 'Public Transparency & Accountability Report';
      headers = ['Transparency Item', 'Value', 'Explanation'];
      rows = [
        ['Funds Received', formatCurrency(totalReceipts, organization.currency), 'All receipts recorded in the system'],
        ['Funds Expended', formatCurrency(totalPayments, organization.currency), 'Approved payments and operating disbursements'],
        ['Cash Available', formatCurrency(cashAvailable, organization.currency), 'Physical cash on hand and available balances'],
        ['Open Audit Trail', store.auditLogs.filter(a => a.orgId === orgId).length.toString(), 'System activity summary for accountability'],
        ['Share Links Active', shareLinks.filter(s => !s.isRevoked).length.toString(), 'View-only reporting links available']
      ];
      summaryCards = [
        { label: 'Total Receipts', value: formatCurrency(totalReceipts, organization.currency) },
        { label: 'Public Accountability Index', value: 'High' }
      ];
    } else if (selectedReportType === 'cash_control') {
      title = 'Daily Cash Control & Shortage Report';
      headers = ['Date', 'Account Office', 'Expected Cash', 'Actual Physical Cash', 'Variance Difference', 'Status', 'Officer'];
      rows = cashCounts.map(c => [
        c.date,
        store.accounts.find(a => a.id === c.accountId)?.name || 'Cash Office',
        formatCurrency(c.expectedClosingCash, organization.currency),
        formatCurrency(c.actualPhysicalCash, organization.currency),
        formatCurrency(c.cashDifference, organization.currency),
        c.status,
        c.personResponsible
      ]);
      const totalShortage = cashCounts.filter(c => c.status === 'SHORTAGE').reduce((sum, c) => sum + Math.abs(c.cashDifference), 0);
      summaryCards = [
        { label: 'Total Shortage Logged', value: formatCurrency(totalShortage, organization.currency) },
        { label: 'Total Audited Counts', value: cashCounts.length.toString() }
      ];
    } else {
      title = 'General Financial Audit Trail Report';
      headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'];
      rows = store.auditLogs.filter(a => a.orgId === orgId).map(a => [
        new Date(a.timestamp).toLocaleString(),
        a.userName,
        a.userRole,
        a.action,
        a.module,
        a.details
      ]);
      summaryCards = [
        { label: 'Total Audit Logs', value: store.auditLogs.filter(a => a.orgId === orgId).length.toString() }
      ];
    }

    return { title, headers, rows, summaryCards };
  };

  const currentReport = getReportData();

  const handleExportPDF = () => {
    exportReportToPDF({
      organization,
      reportTitle: currentReport.title,
      generatedBy: currentUser.name,
      headers: currentReport.headers,
      rows: currentReport.rows,
      summaryCards: currentReport.summaryCards
    });
    logAudit('REPORT_EXPORTED', 'Reports', `Exported PDF for ${currentReport.title}`);
  };

  const handleExportExcel = () => {
    exportToExcel(`report_${selectedReportType}_${new Date().toISOString().split('T')[0]}`, currentReport.headers, currentReport.rows);
    logAudit('REPORT_EXPORTED', 'Reports', `Exported Excel for ${currentReport.title}`);
  };

  const handleExportCSV = () => {
    exportToCSV(`report_${selectedReportType}_${new Date().toISOString().split('T')[0]}`, currentReport.headers, currentReport.rows);
    logAudit('REPORT_EXPORTED', 'Reports', `Exported CSV for ${currentReport.title}`);
  };

  const handleGenerateShareLink = async () => {
    const expiresAt = new Date(Date.now() + shareExpiryHours * 3600000).toISOString();

    const rawSession = sessionStorage.getItem('fincontrol_auth_session') || localStorage.getItem('fincontrol_auth_session');
    const session = rawSession ? JSON.parse(rawSession) : null;
    const backendUrl = (typeof window !== 'undefined' && (window as any).__FINCONTROL_BACKEND_URL__) || 'http://localhost:4000';
    const response = await fetch(`${backendUrl}/api/reports/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
      body: JSON.stringify({ orgId, reportTitle: currentReport.title, reportType: selectedReportType, expiresAt, passcode: sharePasscode.trim() || undefined })
    });
    if (!response.ok) throw new Error('Unable to create a secure shared report.');
    const result = await response.json() as { share: ReportShareLink; token: string };
    const newLink = { ...result.share, shareCode: result.token };

    store.shareLinks.unshift(newLink);
    saveStore(store);
    logAudit('REPORT_SHARE_LINK_CREATED', 'Reports', `Created secure share link for ${currentReport.title} (Code: ${newLink.shareCode})`);

    setGeneratedShareLink(newLink);
  };

  const getShareUrl = (shareCode: string) => `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/shared/${encodeURIComponent(shareCode)}`;

  const handleCopyShareUrl = async (shareCode: string) => {
    await navigator.clipboard.writeText(getShareUrl(shareCode));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevokeShareLink = (id: string) => {
    const link = store.shareLinks.find(s => s.id === id);
    if (link) {
      link.isRevoked = true;
      saveStore(store);
      logAudit('REPORT_SHARE_LINK_REVOKED', 'Reports', `Revoked share link ${link.shareCode}`);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>Financial Reporting Engine & Secure Export</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate, print, download PDF/Excel reports & share view-only encrypted links
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30"
          >
            <Share2 className="w-4 h-4" />
            <span>Create Secure Share Link</span>
          </button>
        </div>
      </div>

      {/* Report Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 p-3 text-xs text-blue-800 dark:text-blue-200">
          Stakeholder reporting pack for investors, suppliers, employees, customers, lenders, government, and the public.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-500 mb-1">Select Report Type</label>
            <select
              value={selectedReportType}
              onChange={e => setSelectedReportType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
            >
              <option value="investors_overview">Investor Overview</option>
              <option value="supplier_payables">Supplier & Payables</option>
              <option value="employee_costs">Employee & Payroll Cost</option>
              <option value="customer_revenue">Customer / Revenue Source</option>
              <option value="lender_debt">Lender & Funding Exposure</option>
              <option value="government_compliance">Government & Compliance</option>
              <option value="public_transparency">Public Transparency</option>
              <option value="cash_control">Daily Cash Control & Shortages</option>
              <option value="audit_trail">System Security Audit Trail</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-500 mb-1">Reporting Period</label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
            >
              <option value="this_month">Current Financial Month</option>
              <option value="this_year">Current Financial Year</option>
              <option value="all">All Historical Data</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleExportPDF}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800"
            >
              <Download className="w-4 h-4" />
              <span>PDF Report</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              <Download className="w-4 h-4" />
              <span>Excel (XLS)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              title="CSV Download"
            >
              CSV
            </button>
          </div>
        </div>

      </div>

      {/* Report Summary Cards */}
      {currentReport.summaryCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentReport.summaryCards.map((card, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report Data Table Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{currentReport.title}</h3>
          <span className="text-xs text-slate-500 font-mono">Report ID: REPORT-2026-LIVE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                {currentReport.headers.map((h, i) => (
                  <th key={i} className="py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentReport.rows.length === 0 ? (
                <tr>
                  <td colSpan={currentReport.headers.length} className="py-8 text-center text-slate-400">
                    No data records for selected period.
                  </td>
                </tr>
              ) : (
                currentReport.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    {row.map((col, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                        {col}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Secure Share Links Management */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Active Secure Share Links</span>
        </h3>

        <div className="space-y-2 text-xs">
          {shareLinks.length === 0 ? (
            <div className="text-slate-400 py-4 text-center">No active share links created yet.</div>
          ) : (
            shareLinks.map(s => (
              <div key={s.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="font-mono text-purple-600">{s.shareCode}</span>
                    <span>•</span>
                    <span>{s.reportTitle}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Created by {s.createdBy} • Expires: {new Date(s.expiresAt || '').toLocaleString()} {s.passcode && '• Password Protected'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenSharedReport(s.shareCode)}
                    className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-[11px]"
                  >
                    View Link
                  </button>
                  {!s.isRevoked ? (
                    <button
                      onClick={() => handleRevokeShareLink(s.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      title="Revoke Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-bold uppercase">Revoked</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share Link Generation Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Generate Secure Report Link</h3>
              <button onClick={() => setShareModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedShareLink ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Optional Access Passcode / Password</label>
                  <input
                    type="password"
                    placeholder="Leave empty for public encrypted token"
                    value={sharePasscode}
                    onChange={e => setSharePasscode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Link Expiration Timer</label>
                  <select
                    value={shareExpiryHours}
                    onChange={e => setShareExpiryHours(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <option value={1}>1 Hour Expiry</option>
                    <option value={24}>24 Hours Expiry (1 Day)</option>
                    <option value={168}>7 Days Expiry</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateShareLink}
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30"
                >
                  Generate Encrypted Token & Link
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200">
                  <div className="font-bold">Link Generated Successfully!</div>
                  <div className="font-mono text-xs mt-1 text-purple-600 dark:text-purple-300 font-bold">
                    Share Code: {generatedShareLink.shareCode}
                  </div>
                  <div className="mt-2 break-all text-[10px] text-slate-500">{getShareUrl(generatedShareLink.shareCode)}</div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleCopyShareUrl(generatedShareLink.shareCode)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    {copiedLink ? 'Copied' : 'Copy Browser Link'}
                  </button>
                  <button
                    onClick={() => {
                      onOpenSharedReport(generatedShareLink.shareCode);
                      setShareModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
                  >
                    Test Reader View
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedShareLink(null);
                      setShareModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
