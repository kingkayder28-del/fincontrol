import React, { useState } from 'react';
import { Calculator, FileText, Download, AlertCircle, CheckCircle2, Clock, FileUp, DollarSign, TrendingUp } from 'lucide-react';
import { Organization, User, TaxConfiguration, TaxObligation } from '../types';
import { calculateMonthlyTaxObligations, getTaxAuthorityByCountry, getAvailableTaxAuthorities } from '../lib/tax';
import { getStore, formatCurrency } from '../lib/storage';

interface TaxObligationsViewProps {
  organization: Organization;
  currentUser: User;
}

export const TaxObligationsView: React.FC<TaxObligationsViewProps> = ({ organization, currentUser }) => {
  const store = getStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [taxRate, setTaxRate] = useState(16.5);
  const [taxConfigOpen, setTaxConfigOpen] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [obligations, setObligations] = useState<TaxObligation[]>([]);

  const orgReceipts = store.receipts.filter(r => r.orgId === organization.id);
  const orgPayments = store.payments.filter(p => p.orgId === organization.id);
  
  const taxAuthority = getTaxAuthorityByCountry(organization.country.substring(0, 2).toUpperCase());
  const currentYear = new Date().getFullYear();

  const handleCalculateTaxObligations = () => {
    const defaultTaxConfig: TaxConfiguration = {
      id: `tax-config-${organization.id}`,
      orgId: organization.id,
      country: organization.country,
      taxAuthority,
      taxRate,
      deductibleExpensesCategories: [],
      nonDeductibleExpensesCategories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const calculated = calculateMonthlyTaxObligations(
      organization.id,
      selectedYear,
      orgReceipts,
      orgPayments,
      defaultTaxConfig
    );

    setObligations(calculated);
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Pending' },
    partially_paid: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Partially Paid' },
    fully_paid: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Fully Paid' }
  };

  const totalTaxLiability = obligations.reduce((sum, o) => sum + o.estimatedTaxLiability, 0);
  const totalTaxPaid = obligations.reduce((sum, o) => sum + o.amountPaid, 0);
  const totalTaxDue = totalTaxLiability - totalTaxPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Tax Obligations & Computations</h1>
        <p className="text-slate-600 dark:text-slate-400">Calculate and track tax liabilities for your organization</p>
      </div>

      {/* Tax Configuration Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Tax Configuration
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {taxAuthority ? `${taxAuthority.name} (${organization.country})` : 'Configure tax calculations'}
            </p>
          </div>
          <button
            onClick={() => setTaxConfigOpen(!taxConfigOpen)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            {taxConfigOpen ? 'Close' : 'Configure'}
          </button>
        </div>

        {taxConfigOpen && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {/* Tax Authority Info */}
            {taxAuthority && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Tax Authority</p>
                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                  <p><strong>Name:</strong> {taxAuthority.name}</p>
                  <p><strong>Country:</strong> {taxAuthority.country}</p>
                  {taxAuthority.website && (
                    <p><strong>Website:</strong> <a href={taxAuthority.website} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">{taxAuthority.website}</a></p>
                  )}
                </div>
              </div>
            )}

            {/* Tax Rate Configuration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-white">
                Tax Rate (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white w-40"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Current standard rate for {organization.country}
                </span>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                Tax Authority Guidelines & Documents
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload tax authority documents or guidelines to reference during tax computation
              </p>
              <button
                onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium"
              >
                {showDocumentUpload ? 'Hide Upload' : 'Upload Documents'}
              </button>

              {showDocumentUpload && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Upload tax authority guidelines, rate schedules, or deduction rules (PDF, Word, Excel, Text)
                  </p>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateTaxObligations}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Calculate Tax Obligations for {selectedYear}
            </button>
          </div>
        )}
      </div>

      {/* Year & Period Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
          Tax Year
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            min={2020}
            max={currentYear + 1}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
          <button
            onClick={handleCalculateTaxObligations}
            disabled={obligations.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            Calculate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {obligations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-700">Total Tax Liability</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalTaxLiability, organization.currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500">All periods in {selectedYear}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-700">Amount Paid</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalTaxPaid, organization.currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Payments received</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-700">Amount Due</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalTaxDue, organization.currency)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Remaining balance</p>
          </div>
        </div>
      )}

      {/* Tax Obligations Table */}
      {obligations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Tax Obligations by Period
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Taxable Income</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Tax Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Tax Liability</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Amount Paid</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((obligation) => {
                  const config = statusConfig[obligation.status];
                  const Icon = config.icon;
                  const balanceDue = obligation.estimatedTaxLiability - obligation.amountPaid;

                  return (
                    <tr key={obligation.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{obligation.taxPeriod}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatCurrency(obligation.taxableIncome, organization.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{obligation.appliedTaxRate}%</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(obligation.estimatedTaxLiability, organization.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(obligation.amountPaid, organization.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className={config.color}>{config.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(obligation.paymentDeadline) < new Date() ? (
                          <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            Overdue
                          </span>
                        ) : (
                          obligation.paymentDeadline
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Export Button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium">
              <Download className="w-4 h-4" />
              Export Tax Report
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {obligations.length === 0 && (
        <div className="text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">No tax obligations calculated yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
            Configure your tax settings and click "Calculate Tax Obligations" to begin
          </p>
          <button
            onClick={() => setTaxConfigOpen(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Get Started
          </button>
        </div>
      )}
    </div>
  );
};
