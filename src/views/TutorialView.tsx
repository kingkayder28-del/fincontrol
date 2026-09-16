import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Building2,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Clock,
  FileSpreadsheet
} from 'lucide-react';

interface TutorialViewProps {
  onNavigate: (view: string) => void;
}

export const TutorialView: React.FC<TutorialViewProps> = ({ onNavigate }) => {
  const [activeStep, setActiveStep] = useState(0);

  const tutorialSteps = [
    {
      title: '1. Daily Petty Cash Control & Physical Counts',
      icon: Calculator,
      color: 'bg-amber-500 text-white',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            LedgerNest enforces daily physical cash reconciliation. At the end of every business day, petty cash custodians record physical bank notes and coins using the denomination counter.
          </p>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <strong>Key Compliance Rule:</strong> The app automatically calculates expected cash using <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded">Opening Cash + Today's Receipts - Today's Payments</code>. Any variance immediately flags a <strong>SHORTAGE</strong> or <strong>EXCESS</strong> requiring an explanation.
          </div>
          <button
            onClick={() => onNavigate('cash-control')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Try Cash Control Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      title: '2. Separation of Duties & Dual Payment Approval',
      icon: Clock,
      color: 'bg-teal-500 text-white',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            To eliminate internal fraud, payments exceeding your organization's <strong>Approval Threshold Limit</strong> automatically enter the <em>Pending Approval</em> queue.
          </p>
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-900 dark:text-teal-200">
            <strong>Audit Guardrail:</strong> A user cannot approve a payment voucher that they created themselves. Authorized approvers or finance directors must review and electronically sign off on vouchers before payout execution.
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Open Approvals Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      title: '3. Bank Statement Reconciliation & Reconciliation Logs',
      icon: CheckCircle2,
      color: 'bg-blue-500 text-white',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Reconcile bank accounts and mobile money wallets directly against official monthly bank statements.
          </p>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
            Select cleared deposits and withdrawals in the app. LedgerNest compares statement ending balances against system calculated figures to guarantee 0.00 discrepancy.
          </div>
          <button
            onClick={() => onNavigate('bank-reconciliation')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Start Bank Reconciliation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      title: '4. Project & Donor Grant Budget Tracking',
      icon: Building2,
      color: 'bg-purple-500 text-white',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Assign every transaction to specific donor grants, projects, or internal cost centres.
          </p>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200">
            Monitor real-time grant absorption, remaining budget lines, and generate donor-specific financial reports in PDF and Excel format.
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Explore Projects & Funds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
    {
      title: '5. Immutable Audit Trail & Encrypted Report Sharing',
      icon: ShieldCheck,
      color: 'bg-emerald-500 text-white',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Every creation, update, approval, or organization switch is logged with user identity, timestamp, and details.
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
            Share secure, passcode-protected report links with external auditors or board members without giving full system admin privileges.
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Generate Financial Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const currentStepObj = tutorialSteps[activeStep];
  const StepIcon = currentStepObj.icon;

  return (
    <div className="max-w-4xl space-y-6 pb-12 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-bold text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Interactive User Tutorial & Best Practices</h1>
            <p className="mt-0.5 text-xs text-slate-300">Master internal financial controls, petty cash verification, and audit readiness</p>
          </div>
        </div>
      </div>

      {/* Main Stepper Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        
        {/* Step Buttons */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
          {tutorialSteps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === activeStep;
            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>Step {idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content Card */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${currentStepObj.color} flex items-center justify-center font-bold shadow-md`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {currentStepObj.title}
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            {currentStepObj.content}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(prev => prev - 1)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold text-slate-500">
            Step {activeStep + 1} of {tutorialSteps.length}
          </span>

          <button
            disabled={activeStep === tutorialSteps.length - 1}
            onClick={() => setActiveStep(prev => prev + 1)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
          >
            <span>Next Step</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
