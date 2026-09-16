import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, FileText, ShieldAlert, Mail, Phone, ExternalLink } from 'lucide-react';

export const HelpCentreView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does cash shortage calculation work?',
      a: 'LedgerNest calculates Expected Cash using: Opening Cash + Total Cash Receipts - Total Cash Payments. When a custodian inputs physical bank notes and coins during the Daily Cash Count, the app computes (Physical Cash - Expected Cash). A negative value triggers a SHORTAGE alert in red, while a positive value indicates an EXCESS.'
    },
    {
      q: 'What is the Payment Approval Threshold Limit?',
      a: 'The Payment Approval Threshold Limit is a financial governance setting configured in Organization Settings. Any payment voucher recorded above this amount automatically moves to pending_approval status and requires sign-off from an authorized approver or finance manager before being paid.'
    },
    {
      q: 'How does Separation of Duties work in LedgerNest?',
      a: 'Separation of Duties ensures internal control integrity: the user who created a payment voucher is strictly forbidden from approving that same payment voucher. Approval must come from a distinct user account holding an approver or admin role.'
    },
    {
      q: 'Can I export financial reports to Excel and PDF?',
      a: 'Yes! The Reports & Exports module generates instant PDF reports formatted with official headers, signature blocks, and timestamps. You can also export transaction logs to Microsoft Excel (.xlsx) and CSV format for donor reporting.'
    },
    {
      q: 'How do secure report share links work?',
      a: 'You can generate a temporary or passcode-protected web share link for external auditors or board members. They can view real-time financial statements without needing a user account or password on your system.'
    }
  ];

  const filteredFaqs = faqs.filter(
    f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support & Documentation</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Help Centre & Compliance Knowledge Base</h1>
          <p className="text-xs text-slate-300 mt-1">Find answers to accounting procedures, security rules, and system usage.</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
          Frequently Asked Questions ({filteredFaqs.length})
        </h2>

        {filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No matching help articles found.</div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact Support Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Financial Systems Helpdesk</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Email support@fincontrolpro.org for dedicated technical assistance.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3">
          <Phone className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Audit & Compliance Advisory</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Contact senior compliance leads for audit preparation assistance.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
