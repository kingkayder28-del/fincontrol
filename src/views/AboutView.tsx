import React from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, Cpu, Globe2, Lock, Award } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6 pb-12 animate-in fade-in">
      
      {/* Hero Banner */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-sm text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-lg font-bold text-white">
          FC
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">LedgerNest</h1>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-slate-300">
          The ultimate financial control & cash management system for NGOs, Government agencies, educational institutions, churches, and businesses across sub-Saharan Africa and globally.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono text-slate-200">
          <span>VERSION 2.4.0 • PRODUCTION RELEASE</span>
        </div>
      </div>

      {/* Enterprise Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Separation of Duties</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Guarantees distinct creator and approver credentials for high-value vouchers, preventing single-user fraud.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Cpu className="w-6 h-6 text-blue-500" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Cash Denomination Engine</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Physical bank note & coin counting with dynamic formula verification to catch petty cash discrepancies instantly.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Globe2 className="w-6 h-6 text-purple-500" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Multi-Currency & Multi-Tenant</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Supports MWK, USD, EUR, GBP, KES, ZAR, NGN with instant tenant switching and isolated ledger storage.
          </p>
        </div>
      </div>

      {/* Compliance Standard Checklist */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Accounting Standards & Compliance Certifications</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>IPSAS (International Public Sector Accounting Standards)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>IFRS for Small & Medium Entities</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>USAID & EU Donor Financial Guidelines</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Cryptographic Audit Log Immutability</span>
          </div>
        </div>
      </div>

    </div>
  );
};
