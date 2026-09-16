import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownLeft, Upload, Paperclip, CheckCircle2, AlertCircle } from 'lucide-react';
import { Organization, User, Receipt, Attachment } from '../types';
import {
  getStore,
  saveStore,
  generateReceiptNumber,
  logAudit,
  formatCurrency,
  getInventoryProductSuggestions
} from '../lib/storage';

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  currentUser: User;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentUser
}) => {
  if (!isOpen) return null;

  const store = getStore();
  const orgId = organization.id;

  const incomeCategories = store.categories.filter(c => c.orgId === orgId && c.type === 'income');
  const orgAccounts = store.accounts.filter(a => a.orgId === orgId && a.status === 'active');
  const orgProjects = store.projects.filter(p => p.orgId === orgId && p.status === 'active');
  const orgDepts = store.departments.filter(d => d.orgId === orgId);
  const orgInventory = store.inventory.filter(item => item.orgId === orgId);

  const autoRcptNo = generateReceiptNumber(orgId);
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const buildDefaultReference = (dateValue: string) => {
    const dayTransactions = store.receipts.filter(receipt => receipt.orgId === orgId && receipt.date === dateValue).length + 1;
    return `SALE-${dateValue.replace(/-/g, '')}-${String(dayTransactions).padStart(3, '0')}`;
  };

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTime);
  const [receivedFrom, setReceivedFrom] = useState(organization.type === 'Business' ? 'PAYER' : 'Customer / donor / member');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(incomeCategories[0]?.id || '');
  const [accountId, setAccountId] = useState(orgAccounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_money' | 'cheque' | 'other'>('cash');
  const [amount, setAmount] = useState<number | ''>('');
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [referenceNo, setReferenceNo] = useState(() => buildDefaultReference(todayStr));
  const [customerDonorMember, setCustomerDonorMember] = useState('');
  const [projectFundId, setProjectFundId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

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

  const productSuggestions = useMemo(
    () => getInventoryProductSuggestions(orgId, productQuery),
    [orgId, productQuery]
  );

  const handleProductInputChange = (value: string) => {
    setProductQuery(value);

    if (!value.trim()) {
      setSelectedProductId('');
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const exactMatch = orgInventory.find(item =>
      item.productName.trim().toLowerCase() === normalizedValue ||
      item.sku.trim().toLowerCase() === normalizedValue ||
      `${item.productName} (${item.sku})`.toLowerCase() === normalizedValue
    );

    if (exactMatch) {
      setSelectedProductId(exactMatch.id);
      setProductQuery(`${exactMatch.productName} (${exactMatch.sku})`);
    } else {
      setSelectedProductId('');
    }
  };

  const selectedProduct = orgInventory.find(item => item.id === selectedProductId) || null;

  useEffect(() => {
    const nextReference = buildDefaultReference(date);
    const isAutoReference = !referenceNo || referenceNo.startsWith('SALE-') && referenceNo.includes(date.replace(/-/g, ''));

    if (isAutoReference) {
      setReferenceNo(nextReference);
    }
  }, [date]);

  useEffect(() => {
    if (!selectedProduct) return;

    const unitPrice = Number(selectedProduct.unitPrice || 0);
    const qtyValue = Number(quantity) || 0;
    const amountValue = Number(amount) || 0;

    if (unitPrice > 0 && amountValue > 0 && (!quantity || qtyValue <= 0)) {
      const inferredQty = Number((amountValue / unitPrice).toFixed(2));
      if (inferredQty > 0) setQuantity(inferredQty);
    }

    if (unitPrice > 0 && qtyValue > 0) {
      const inferredAmount = Number((qtyValue * unitPrice).toFixed(2));
      if (amountValue !== inferredAmount) setAmount(inferredAmount);
    }

    if (!description.trim() || description.toLowerCase().startsWith('sale of ')) {
      const inferredDescription = `Sale of ${selectedProduct.productName}${qtyValue > 0 ? ` (${qtyValue} units)` : ''}`;
      setDescription(inferredDescription);
    }
  }, [selectedProduct, quantity, amount, description]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedFrom.trim()) return setErrorMsg('Received From field is required.');
    if (!description.trim()) return setErrorMsg('Description field is required.');
    if (!amount || Number(amount) <= 0) return setErrorMsg('Amount must be greater than zero.');
    if (!accountId) return setErrorMsg('Please select a receiving account.');

    const numAmount = Number(amount);

    if (selectedProduct && (!quantity || Number(quantity) <= 0)) {
      return setErrorMsg('Please enter a valid quantity for the product sold.');
    }

    if (selectedProduct && Number(quantity) > selectedProduct.currentQuantity) {
      return setErrorMsg(`Only ${selectedProduct.currentQuantity} units of ${selectedProduct.productName} are currently in stock.`);
    }

    if (selectedProduct) {
      const confirmed = window.confirm(
        `Please confirm this inventory sale:\n\n` +
        `Product: ${selectedProduct.productName}\n` +
        `SKU / Size: ${selectedProduct.sku}\n` +
        `Quantity: ${quantity}\n` +
        `Selling price per unit: ${formatCurrency(selectedProduct.unitPrice, organization.currency)}\n` +
        `Total amount: ${formatCurrency(numAmount, organization.currency)}\n\n` +
        `Select OK to save this record or Cancel to correct it.`
      );

      if (!confirmed) return;
    }

    const newReceipt: Receipt = {
      id: `rcpt-${Date.now()}`,
      orgId,
      receiptNumber: autoRcptNo,
      date,
      time,
      receivedFrom: receivedFrom.trim(),
      description: description.trim(),
      categoryId,
      accountId,
      paymentMethod,
      amount: numAmount,
      productId: selectedProductId || undefined,
      quantity: selectedProductId ? Number(quantity) : undefined,
      referenceNo: referenceNo.trim() || undefined,
      customerDonorMember: customerDonorMember.trim() || undefined,
      projectFundId: projectFundId || undefined,
      departmentId: departmentId || undefined,
      notes: notes.trim() || undefined,
      attachments,
      recordedByUserId: currentUser.id,
      recordedByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    store.receipts.unshift(newReceipt);

    const targetAccount = store.accounts.find(a => a.id === accountId);
    if (targetAccount) {
      targetAccount.currentBalance += numAmount;
    }

    if (selectedProduct && quantity) {
      const stockReduction = Number(quantity);
      const stockItem = store.inventory.find(inv => inv.id === selectedProduct.id && inv.orgId === orgId);
      if (stockItem) {
        stockItem.currentQuantity = Math.max(0, stockItem.currentQuantity - stockReduction);
        stockItem.lastUpdated = new Date().toISOString();
      }
    }

    saveStore(store);
    logAudit(
      'RECEIPT_CREATED',
      'Receipts',
      `Recorded ${autoRcptNo} for ${formatCurrency(numAmount, organization.currency)} from ${receivedFrom}${selectedProduct ? `; inventory updated: ${selectedProduct.productName} (-${quantity})` : ''}`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record New Daily Receipt</h2>
              <div className="text-xs text-slate-500 font-mono">Auto Number: <span className="font-bold text-emerald-600 dark:text-emerald-400">{autoRcptNo}</span></div>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Received From (Payer / Donor / Member) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Global Water Foundation, John Banda..."
                value={receivedFrom}
                onChange={e => setReceivedFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Grant disbursement, Annual membership subscription..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Income Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {incomeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product / Inventory Item</label>
              <input
                type="text"
                list="inventory-product-suggestions"
                value={productQuery}
                onChange={e => handleProductInputChange(e.target.value)}
                placeholder="Type product name or start typing..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="inventory-product-suggestions">
                {productSuggestions.map(item => (
                  <option key={item.id} value={`${item.productName} (${item.sku})`} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Qty Sold</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedProductId}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 p-2 text-[11px] text-emerald-700 dark:text-emerald-300">
              Matched product: <span className="font-bold">{selectedProduct.productName} ({selectedProduct.sku})</span> · {formatCurrency(selectedProduct.unitPrice, organization.currency)} each · {selectedProduct.currentQuantity} units currently in stock
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {orgAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'cash' | 'bank' | 'mobile_money' | 'cheque' | 'other')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference No.</label>
              <input
                type="text"
                placeholder="Optional"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer / Donor / Member</label>
              <input
                type="text"
                placeholder="Optional"
                value={customerDonorMember}
                onChange={e => setCustomerDonorMember(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project / Department</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={projectFundId}
                  onChange={e => setProjectFundId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Project</option>
                  {orgProjects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>

                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Department</option>
                  {orgDepts.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes or comments"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-900/20"
            >
              Save Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
