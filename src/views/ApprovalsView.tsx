import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, ShieldAlert, FileText, ArrowUpRight, PackageCheck } from 'lucide-react';
import { Organization, User, Payment, InventoryImportApproval } from '../types';
import { getStore, saveStore, formatCurrency, logAudit, approveInventoryImport, rejectInventoryImport } from '../lib/storage';

interface ApprovalsViewProps {
  organization: Organization;
  currentUser: User;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  organization,
  currentUser
}) => {
  const store = getStore();
  const orgId = organization.id;

  const pendingPayments = store.payments.filter(p => p.orgId === orgId && p.status === 'pending_approval');
  const pendingInventoryApprovals = store.inventoryImportApprovals.filter(item => item.orgId === orgId && item.status === 'pending');
  const pastApprovals = store.payments.filter(p => p.orgId === orgId && (p.status === 'approved' || p.status === 'rejected'));

  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (payment: Payment) => {
    // Separation of duties rule: user cannot approve their own recorded payment!
    if (payment.recordedByUserId === currentUser.id && currentUser.role !== 'admin') {
      return alert('Separation of Duties Policy: You cannot approve a payment voucher that you created yourself.');
    }

    payment.status = 'approved';
    payment.approvedByUserId = currentUser.id;
    payment.approvedByName = currentUser.name;
    payment.approvedAt = new Date().toISOString();

    // Deduct from source account balance now that payment is approved
    const sourceAcc = store.accounts.find(a => a.id === payment.accountId);
    if (sourceAcc) {
      sourceAcc.currentBalance -= payment.amount;
    }

    saveStore(store);
    logAudit(
      'PAYMENT_APPROVED',
      'Approvals',
      `Approved ${payment.paymentNumber} (${formatCurrency(payment.amount, organization.currency)}) to ${payment.payee}`
    );

    alert(`Payment Voucher ${payment.paymentNumber} approved successfully!`);
  };

  const handleReject = () => {
    if (!targetPayment) return;
    if (!rejectReason.trim()) return alert('Please enter a rejection reason.');

    targetPayment.status = 'rejected';
    targetPayment.rejectionReason = rejectReason.trim();

    saveStore(store);
    logAudit(
      'PAYMENT_REJECTED',
      'Approvals',
      `Rejected ${targetPayment.paymentNumber}. Reason: ${rejectReason}`
    );

    setRejectionModalOpen(false);
    setTargetPayment(null);
    setRejectReason('');
  };

  const handleApproveInventoryImport = (approval: InventoryImportApproval) => {
    if (approval.createdByUserId === currentUser.id && currentUser.role !== 'admin') {
      return alert('Separation of Duties Policy: You cannot approve a product update that you imported yourself.');
    }

    const result = approveInventoryImport(approval.id, currentUser);
    if (!result) return alert('This inventory import approval is no longer available.');

    logAudit(
      'INVENTORY_IMPORT_APPROVED',
      'Approvals',
      `Approved imported sales update for ${result.productName} (${result.importedQuantity} units).`
    );
  };

  const handleRejectInventoryImport = (approval: InventoryImportApproval) => {
    const reason = window.prompt(`State the reason for rejecting the sales update of ${approval.productName}:`, 'Incorrect quantity or product match');
    if (!reason || !reason.trim()) return;

    rejectInventoryImport(approval.id, currentUser, reason.trim());
    logAudit(
      'INVENTORY_IMPORT_REJECTED',
      'Approvals',
      `Rejected imported sales update for ${approval.productName}. Reason: ${reason.trim()}`
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-500" />
          <span>Payment Voucher Approval Inbox</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Separation of duties & sign-off controls for expenditure exceeding threshold limit ({formatCurrency(organization.approvalThreshold, organization.currency)})
        </p>
      </div>

      {/* Pending Approval Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Awaiting Approval ({pendingPayments.length})
        </h3>

        {pendingPayments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-800 dark:text-slate-200">Inbox Clear</div>
            <p className="mt-1">All payment vouchers have been reviewed and approved.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPayments.map(p => {
              const isOwnPayment = p.recordedByUserId === currentUser.id;

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{p.paymentNumber}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{p.payee}</h4>
                      <div className="text-xs text-slate-500">{p.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                        {formatCurrency(p.amount, organization.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{p.paymentMethod}</div>
                    </div>
                  </div>

                  {isOwnPayment && (
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Separation of Duties: You created this payment. Approval requires another authorized manager.</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Created By: {p.recordedByName} ({p.date})</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(p)}
                      disabled={isOwnPayment && currentUser.role !== 'admin'}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        isOwnPayment && currentUser.role !== 'admin'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Payment</span>
                    </button>

                    <button
                      onClick={() => {
                        setTargetPayment(p);
                        setRejectionModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-200"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-violet-500" />
          Pending Inventory Sales Imports ({pendingInventoryApprovals.length})
        </h3>

        {pendingInventoryApprovals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No pending product sales updates to review.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInventoryApprovals.map(approval => (
              <div key={approval.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-violet-500 font-bold">Inventory update</div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{approval.productName}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-violet-700 dark:text-violet-300">-{approval.importedQuantity}</div>
                    <div className="text-[10px] uppercase text-slate-500">units</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Existing stock: {approval.existingQuantity} → Proposed stock: {approval.proposedQuantity}<br />
                  Source: {approval.sourceFileName} (row {approval.sourceRow})<br />
                  Imported by: {approval.createdByName}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApproveInventoryImport(approval)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Approve Update
                  </button>
                  <button
                    onClick={() => handleRejectInventoryImport(approval)}
                    className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Decisions Log */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Past Approval Decisions History</h3>

        <div className="space-y-2 text-xs">
          {pastApprovals.map(p => (
            <div key={p.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="font-mono text-slate-500">{p.paymentNumber}</span>
                  <span>•</span>
                  <span>{p.payee}</span>
                </div>
                <div className="text-[11px] text-slate-500">{p.description}</div>
              </div>

              <div className="text-right">
                <div className="font-bold">{formatCurrency(p.amount, organization.currency)}</div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reject Payment Voucher</h3>
            <p className="text-xs text-slate-500">Provide an audit reason for rejecting payment {targetPayment?.paymentNumber}.</p>

            <textarea
              rows={3}
              required
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectionModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs">
                Cancel
              </button>
              <button onClick={handleReject} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
