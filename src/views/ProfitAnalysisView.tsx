import React, { useMemo, useState } from 'react';
import { BarChart3, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { Organization, User } from '../types';
import { formatCurrency, getStore } from '../lib/storage';

interface ProfitAnalysisViewProps {
  organization: Organization;
  currentUser: User;
}

type Period = 'day' | 'week' | 'month';

const toDateInputValue = (date: Date) => date.toISOString().split('T')[0];

const getPeriodStart = (dateValue: string, period: Period) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (period === 'day') return dateValue;
  if (period === 'week') {
    const day = date.getDay();
    const offset = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - offset);
  } else {
    date.setDate(1);
  }
  return toDateInputValue(date);
};

const getPeriodEnd = (dateValue: string, period: Period) => {
  const date = new Date(`${getPeriodStart(dateValue, period)}T00:00:00`);
  if (period === 'week') date.setDate(date.getDate() + 6);
  if (period === 'month') date.setMonth(date.getMonth() + 1, 0);
  return toDateInputValue(date);
};

export const ProfitAnalysisView: React.FC<ProfitAnalysisViewProps> = ({ organization, currentUser }) => {
  const store = getStore();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));

  const result = useMemo(() => {
    const start = getPeriodStart(selectedDate, period);
    const end = getPeriodEnd(selectedDate, period);
    const receipts = store.receipts.filter(receipt =>
      receipt.orgId === organization.id && receipt.date >= start && receipt.date <= end
    );
    const payments = store.payments.filter(payment =>
      payment.orgId === organization.id && payment.date >= start && payment.date <= end &&
      (payment.status === 'approved' || payment.status === 'paid')
    );
    const inventoryById = new Map(store.inventory.map(item => [item.id, item]));
    const revenue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const costOfGoodsSold = receipts.reduce((sum, receipt) => {
      if (!receipt.productId || !receipt.quantity) return sum;
      const product = inventoryById.get(receipt.productId);
      return sum + (product ? product.unitCost * receipt.quantity : 0);
    }, 0);
    const operatingExpenses = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const grossProfit = revenue - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses;
    const netCashMovement = revenue - operatingExpenses;

    return {
      start,
      end,
      revenue,
      costOfGoodsSold,
      operatingExpenses,
      grossProfit,
      netProfit,
      netCashMovement,
      receiptsCount: receipts.length,
      paymentsCount: payments.length
    };
  }, [organization.id, period, selectedDate, store]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <ShieldCheck className="mb-2 h-6 w-6" />
        Profit Analysis is restricted to organization administrators.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin only
          </div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Profit Analysis
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Inventory-aware profit reporting for {organization.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {(['day', 'week', 'month'] as Period[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${period === option ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Reporting period: <strong>{result.start}</strong> to <strong>{result.end}</strong>. Only receipts and approved/paid payments inside this period are included.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue" value={result.revenue} tone="emerald" detail={`${result.receiptsCount} receipt records`} currency={organization.currency} />
        <Metric label="Cost of Goods Sold" value={result.costOfGoodsSold} tone="amber" detail="Based on product unit cost × quantity" currency={organization.currency} />
        <Metric label="Operating Expenses" value={result.operatingExpenses} tone="rose" detail={`${result.paymentsCount} approved/paid payments`} currency={organization.currency} />
        <Metric label="Net Profit" value={result.netProfit} tone={result.netProfit >= 0 ? 'blue' : 'rose'} detail="Revenue − COGS − expenses" currency={organization.currency} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300"><TrendingUp className="h-5 w-5" /> Gross Profit</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">{formatCurrency(result.grossProfit, organization.currency)}</div>
          <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Revenue minus the cost of products sold.</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300"><TrendingDown className="h-5 w-5" /> Net Cash Movement</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-900 dark:text-blue-200">{formatCurrency(result.netCashMovement, organization.currency)}</div>
          <div className="mt-1 text-xs text-blue-700 dark:text-blue-400">Receipts minus approved/paid payments. This is not the same as profit when inventory is sold.</div>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; detail: string; tone: 'emerald' | 'amber' | 'rose' | 'blue'; currency: Organization['currency'] }> = ({ label, value, detail, tone, currency }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`mt-2 text-2xl font-extrabold ${tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'rose' ? 'text-rose-600' : 'text-blue-600'}`}>{formatCurrency(value, currency)}</div>
    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{detail}</div>
  </div>
);
