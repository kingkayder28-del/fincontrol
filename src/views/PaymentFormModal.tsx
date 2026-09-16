import React, { useState } from 'react';
import { X, ArrowUpRight, Upload, Paperclip, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Organization, User, Payment, Attachment, Notification } from '../types';
import {
  getStore,
  saveStore,
  generatePaymentNumber,
  logAudit,
  formatCurrency
} from '../lib/storage';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  currentUser: User;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentUser
}) => {
  if (!isOpen) return null;

  const store = getStore();
  const orgId = organization.id;

  const expenseCategories = store.categories.filter(c => c.orgId === orgId && c.type === 'expense');
  const orgAccounts = store.accounts.filter(a => a.orgId === orgId && a.status === 'active');
  const orgProjects = store.projects.filter(p => p.orgId === orgId && p.status === 'active');
  const orgDepts = store.departments.filter(d => d.orgId === orgId);

  const autoPayNo = generatePaymentNumber(orgId);
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTime);
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [accountId, setAccountId] = useState(orgAccounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_money' | 'cheque' | 'other'>('bank');
  const [amount, setAmount] = useState<number | ''>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [projectFundId, setProjectFundId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const numAmount = Number(amount || 0);
  const requiresApproval = numAmount >= (organization.approvalThreshold || 1000000);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newAttach: Attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type
      };
      setAttachments([...attachments, newAttach]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee.trim()) return setErrorMsg('Payee field is required.');
    if (!description.trim()) return setErrorMsg('Description field is required.');
    if (!amount || Number(amount) <= 0) return setErrorMsg('Amount must be greater than zero.');
    if (!accountId) return setErrorMsg('Please select a payment account.');

    const initialStatus = requiresApproval ? 'pending_approval' : 'paid';

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      orgId,
      paymentNumber: autoPayNo,
      date,
      time,
      payee: payee.trim(),
      description: description.trim(),
      categoryId,
      accountId,
      paymentMethod,
      amount: numAmount,
      referenceNo: referenceNo.trim() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      poNo: poNo.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      projectFundId: projectFundId || undefined,
      departmentId: departmentId || undefined,
      notes: notes.trim() || undefined,
      attachments,
      recordedByUserId: currentUser.id,
      recordedByName: currentUser.name,
      status: initialStatus,
      createdAt: new Date().toISOString()
    };

    store.payments.unshift(newPayment);

    // If paid immediately (below threshold), update account balance
    if (initialStatus === 'paid') {
      const targetAccount = store.accounts.find(a => a.id === accountId);
      if (targetAccount) {
        targetAccount.currentBalance -= numAmount;
      }
    } else {
      // Create notification for approvers
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        orgId,
        title: 'Payment Approval Required',
        message: `${autoPayNo} for ${formatCurrency(numAmount, organization.currency)} to ${payee} requires sign-off.`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
        linkView: 'approvals'
      };
      store.notifications.unshift(notif);
    }

    saveStore(store);
    logAudit(
      'PAYMENT_CREATED',
      'Payments',
      `Recorded ${autoPayNo} for ${formatCurrency(numAmount, organization.currency)} to ${payee}. Status: ${initialStatus}`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record New Daily Payment</h2>
              <div className="text-xs text-slate-500 font-mono">Auto Number: <span className="font-bold text-rose-600 dark:text-rose-400">{autoPayNo}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Approval Threshold Notice */}
        {requiresApproval && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Approval Threshold Triggered: </span>
              Amount is ≥ {formatCurrency(organization.approvalThreshold, organization.currency)}. Payment will be submitted for <strong>Management Approval</strong> before disbursement.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payee (Vendor / Contractor / Staff) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Drilling Ltd, City Station Fuel..."
                value={payee}
                onChange={e => setPayee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ({organization.currency.code}) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Expenditure Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Field supervision fuel, Borehole drilling down-payment..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Source Account</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {orgAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type.toUpperCase()})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice #</label>
              <input
                type="text"
                placeholder="Invoice number"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Order (PO #)</label>
              <input
                type="text"
                placeholder="PO number"
                value={poNo}
                onChange={e => setPoNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project / Grant</label>
              <select
                value={projectFundId}
                onChange={e => setProjectFundId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">-- General Fund --</option>
                {orgProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supporting Invoice / Receipt Voucher Attachment</label>
            <div className="flex items-center gap-3">
              <label className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {attachments.map(att => (
                  <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-200">
                    <Paperclip className="w-3 h-3" />
                    <span>{att.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-colors"
            >
              {requiresApproval ? 'Submit for Approval' : 'Execute Payment'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
