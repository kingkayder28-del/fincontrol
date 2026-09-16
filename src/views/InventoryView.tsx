import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Box, TrendingDown, TrendingUp, PackageCheck, AlertTriangle, Pencil, Trash2, ArrowDownToLine, Upload, ShieldCheck } from 'lucide-react';
import { Organization, User, InventoryItem, InventoryMovement, InventoryImportApproval } from '../types';
import { formatCurrency, getInventorySummary, getStore, saveStore, queueInventoryImportApprovals } from '../lib/storage';

interface InventoryViewProps {
  organization: Organization;
  currentUser: User;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ organization, currentUser }) => {
  const store = getStore();
  const [items, setItems] = useState<InventoryItem[]>(
    store.inventory.filter(item => item.orgId === organization.id)
  );
  const [movements, setMovements] = useState<InventoryMovement[]>(
    store.inventoryMovements.filter(item => item.orgId === organization.id)
  );
  const [form, setForm] = useState({
    productName: '',
    sku: '',
    category: 'Business Inventory',
    openingQuantity: '0',
    unitCost: '0',
    unitPrice: '0',
    reorderLevel: '5'
  });
  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '',
    supplier: '',
    invoiceNo: '',
    quantity: '0',
    unitCost: '0'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<InventoryImportApproval[]>(
    getStore().inventoryImportApprovals.filter(item => item.orgId === organization.id && item.status === 'pending')
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => getInventorySummary(organization.id), [organization.id, items]);
  const stockReport = useMemo(() => items.map(item => {
    const purchases = movements
      .filter(entry => entry.itemId === item.id && entry.movementType === 'purchase')
      .reduce((sum, entry) => sum + Math.max(0, entry.quantity), 0);
    const sales = movements
      .filter(entry => entry.itemId === item.id && entry.movementType === 'sale')
      .reduce((sum, entry) => sum + Math.max(0, Math.abs(entry.quantity)), 0);
    const returns = movements
      .filter(entry => entry.itemId === item.id && entry.movementType === 'return')
      .reduce((sum, entry) => sum + Math.max(0, entry.quantity), 0);

    return {
      ...item,
      purchases,
      sales,
      returns,
      onHand: item.currentQuantity
    };
  }), [items, movements]);

  const refreshItems = () => {
    const currentStore = getStore();
    setItems(currentStore.inventory.filter(item => item.orgId === organization.id));
    setMovements(currentStore.inventoryMovements.filter(item => item.orgId === organization.id));
    setPendingApprovals(currentStore.inventoryImportApprovals.filter(item => item.orgId === organization.id && item.status === 'pending'));
  };

  const handleImportSalesFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        throw new Error('The uploaded file does not contain a readable sheet.');
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const approvals = queueInventoryImportApprovals(organization.id, file.name, rows, currentUser);

      if (approvals.length === 0) {
        window.alert('No matching product sales rows were found in that workbook. Please use product names or SKUs that already exist in this organization.');
      } else {
        setPendingApprovals(prev => [...approvals, ...prev]);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import sales sheet.');
    } finally {
      event.target.value = '';
    }
  };

  const addMovement = (item: InventoryItem, type: InventoryMovement['movementType'], quantity: number, notes?: string, unitCost?: number, reference?: string) => {
    const storeState = getStore();
    const movement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      orgId: organization.id,
      itemId: item.id,
      productName: item.productName,
      movementType: type,
      quantity,
      unitCost,
      reference,
      notes,
      createdByUserId: currentUser.id || 'system-user',
      createdByName: currentUser.name || 'System',
      createdAt: new Date().toISOString()
    };

    storeState.inventoryMovements = [movement, ...(storeState.inventoryMovements || [])];
    saveStore(storeState);
    refreshItems();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.productName.trim()) return;

    const storeState = getStore();
    const payload = {
      productName: form.productName.trim(),
      sku: form.sku.trim() || form.productName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || `INV-${Date.now()}`,
      category: form.category.trim() || 'Business Inventory',
      openingQuantity: Number(form.openingQuantity || 0),
      currentQuantity: Number(form.openingQuantity || 0),
      unitCost: Number(form.unitCost || 0),
      unitPrice: Number(form.unitPrice || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      lastUpdated: new Date().toISOString(),
      description: 'Stock tracked via inventory management module'
    };

    if (editingId) {
      const currentItem = storeState.inventory.find(item => item.id === editingId && item.orgId === organization.id);
      if (!currentItem) return;

      currentItem.productName = payload.productName;
      currentItem.sku = payload.sku;
      currentItem.category = payload.category;
      currentItem.openingQuantity = payload.openingQuantity;
      currentItem.currentQuantity = payload.currentQuantity;
      currentItem.unitCost = payload.unitCost;
      currentItem.unitPrice = payload.unitPrice;
      currentItem.reorderLevel = payload.reorderLevel;
      currentItem.lastUpdated = payload.lastUpdated;
      currentItem.description = payload.description;
    } else {
      const newItem = {
        id: `inv-${Date.now()}`,
        orgId: organization.id,
        ...payload
      };

      storeState.inventory.push(newItem);
      addMovement(newItem, 'opening', Number(form.openingQuantity || 0), 'Product added to inventory', Number(form.unitCost || 0), 'INITIAL_SETUP');
    }

    saveStore(storeState);
    refreshItems();
    setForm({
      productName: '',
      sku: '',
      category: 'Business Inventory',
      openingQuantity: '0',
      unitCost: '0',
      unitPrice: '0',
      reorderLevel: '5'
    });
    setEditingId(null);
  };

  const handleRestock = (item: InventoryItem) => {
    const qty = Number(window.prompt(`How many units of ${item.productName} are being restocked?`, '10'));
    if (!qty || Number.isNaN(qty) || qty <= 0) return;

    const unitCost = Number(window.prompt(`Unit cost for ${item.productName}?`, String(item.unitCost || 0)) || item.unitCost || 0);
    const storeState = getStore();
    const found = storeState.inventory.find(inv => inv.id === item.id && inv.orgId === organization.id);
    if (!found) return;

    found.currentQuantity = Math.max(0, found.currentQuantity + qty);
    found.openingQuantity = found.openingQuantity + qty;
    found.unitCost = unitCost || found.unitCost;
    found.lastUpdated = new Date().toISOString();

    addMovement(found, 'purchase', qty, 'Restock / purchase received', unitCost, 'RESTOCK');
    saveStore(storeState);
    refreshItems();
  };

  const handleSale = (item: InventoryItem) => {
    const qty = Number(window.prompt(`How many units of ${item.productName} were sold?`, '5'));
    if (!qty || Number.isNaN(qty) || qty <= 0) return;

    const storeState = getStore();
    const found = storeState.inventory.find(inv => inv.id === item.id && inv.orgId === organization.id);
    if (!found) return;

    if (qty > found.currentQuantity) {
      window.alert(`Only ${found.currentQuantity} units are available for ${item.productName}.`);
      return;
    }

    found.currentQuantity = Math.max(0, found.currentQuantity - qty);
    found.lastUpdated = new Date().toISOString();

    addMovement(found, 'sale', -qty, 'Stock sold to customer', found.unitCost, 'SALE');
    saveStore(storeState);
    refreshItems();
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItem = items.find(item => item.id === purchaseForm.itemId);
    if (!selectedItem) return;

    const qty = Number(purchaseForm.quantity || 0);
    const unitCost = Number(purchaseForm.unitCost || 0);
    if (qty <= 0 || unitCost < 0) return;

    const storeState = getStore();
    const found = storeState.inventory.find(inv => inv.id === selectedItem.id && inv.orgId === organization.id);
    if (!found) return;

    found.currentQuantity = Math.max(0, found.currentQuantity + qty);
    found.openingQuantity = found.openingQuantity + qty;
    found.unitCost = unitCost || found.unitCost;
    found.lastUpdated = new Date().toISOString();

    storeState.inventoryMovements = [{
      id: `mov-${Date.now()}`,
      orgId: organization.id,
      itemId: found.id,
      productName: found.productName,
      movementType: 'purchase',
      quantity: qty,
      unitCost,
      reference: purchaseForm.invoiceNo || 'PURCHASE',
      notes: purchaseForm.supplier ? `Supplier: ${purchaseForm.supplier}` : 'Purchase received',
      createdByUserId: currentUser.id || 'system-user',
      createdByName: currentUser.name || 'System',
      createdAt: new Date().toISOString()
    }, ...(storeState.inventoryMovements || [])];

    saveStore(storeState);
    refreshItems();
    setPurchaseForm({ itemId: '', supplier: '', invoiceNo: '', quantity: '0', unitCost: '0' });
  };

  const handleAdjustStock = (item: InventoryItem, delta: number) => {
    const storeState = getStore();
    const found = storeState.inventory.find(inv => inv.id === item.id && inv.orgId === organization.id);
    if (!found) return;

    found.currentQuantity = Math.max(0, found.currentQuantity + delta);
    found.lastUpdated = new Date().toISOString();

    addMovement(found, 'adjustment', delta, delta >= 0 ? 'Manual stock increase' : 'Manual stock reduction', found.unitCost, 'MANUAL_ADJUSTMENT');
    saveStore(storeState);
    refreshItems();
  };

  const handleReturn = (item: InventoryItem) => {
    const qty = Number(window.prompt(`How many units of ${item.productName} were returned?`, '5'));
    if (!qty || Number.isNaN(qty) || qty <= 0) return;

    const storeState = getStore();
    const found = storeState.inventory.find(inv => inv.id === item.id && inv.orgId === organization.id);
    if (!found) return;

    found.currentQuantity = Math.max(0, found.currentQuantity + qty);
    found.lastUpdated = new Date().toISOString();

    addMovement(found, 'return', qty, 'Customer or supplier return processed', found.unitCost, 'RETURN');
    saveStore(storeState);
    refreshItems();
  };

  const handleDelete = (itemId: string) => {
    if (!window.confirm('Delete this inventory item?')) return;

    const storeState = getStore();
    storeState.inventory = storeState.inventory.filter(item => !(item.id === itemId && item.orgId === organization.id));
    saveStore(storeState);
    refreshItems();
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      productName: item.productName,
      sku: item.sku,
      category: item.category || 'Business Inventory',
      openingQuantity: String(item.openingQuantity),
      unitCost: String(item.unitCost),
      unitPrice: String(item.unitPrice),
      reorderLevel: String(item.reorderLevel)
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-500 font-bold">Inventory</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Management</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
            <span>Products</span>
            <PackageCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalItems}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
            <span>Units</span>
            <Box className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalUnits}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
            <span>Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.lowStockItems}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
            <span>Inventory Value</span>
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(summary.inventoryValue, organization.currency)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Products</h2>
            <div className="text-xs text-slate-500">{items.length} item(s)</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Opening</th>
                  <th className="px-4 py-3 font-semibold">Current</th>
                  <th className="px-4 py-3 font-semibold">Unit Price</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.productName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.sku}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.openingQuantity}</td>
                    <td className={`px-4 py-3 font-semibold ${item.currentQuantity <= item.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {item.currentQuantity}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(item.unitPrice, organization.currency)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleRestock(item)} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold flex items-center gap-1"><ArrowDownToLine className="w-3.5 h-3.5" /> Restock</button>
                        <button onClick={() => handleSale(item)} className="px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-[11px] font-semibold">Sale</button>
                        <button onClick={() => handleReturn(item)} className="px-2 py-1 rounded-lg bg-sky-100 text-sky-700 text-[11px] font-semibold">Return</button>
                        <button onClick={() => handleAdjustStock(item, 5)} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold">+5</button>
                        <button onClick={() => handleAdjustStock(item, -5)} className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-semibold">-5</button>
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg bg-blue-100 text-blue-700"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-rose-100 text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <div className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 text-[10px] font-semibold">
              {editingId ? 'Update' : 'New'}
            </div>
          </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                value={form.productName}
                onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                placeholder="Product name"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <input
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="SKU"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Category"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  value={form.openingQuantity}
                  onChange={e => setForm(f => ({ ...f, openingQuantity: e.target.value }))}
                  placeholder="Opening qty"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))}
                  placeholder="Reorder level"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                  placeholder="Unit cost"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="Unit price"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                <Plus className="w-4 h-4" />
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Sales import</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-700"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Excel
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportSalesFile}
            />

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              Upload a spreadsheet with product and quantity columns such as Product, Item, SKU, Qty, Sales, or Quantity Sold. Each matched product will be staged for approval before stock is reduced.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Pending approval updates</h2>
            <div className="space-y-2">
              {pendingApprovals.length === 0 ? (
                <div className="text-xs text-slate-500">No pending inventory sales approvals.</div>
              ) : (
                pendingApprovals.map((approval) => (
                  <div key={approval.id} className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{approval.productName}</span>
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-100">PENDING</span>
                    </div>
                    <div className="mt-1">Imported: {approval.importedQuantity} units • Existing: {approval.existingQuantity} • Proposed remaining: {approval.proposedQuantity}</div>
                    <div className="mt-1 text-[10px] opacity-80">Source: {approval.sourceFileName} • Row {approval.sourceRow}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Purchase entry</h2>
            <form onSubmit={handlePurchaseSubmit} className="space-y-3">
              <select
                value={purchaseForm.itemId}
                onChange={e => setPurchaseForm(f => ({ ...f, itemId: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">Select product</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.productName}</option>
                ))}
              </select>
              <input
                value={purchaseForm.supplier}
                onChange={e => setPurchaseForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Supplier / source"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <input
                value={purchaseForm.invoiceNo}
                onChange={e => setPurchaseForm(f => ({ ...f, invoiceNo: e.target.value }))}
                placeholder="Invoice / reference"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  value={purchaseForm.quantity}
                  onChange={e => setPurchaseForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="Quantity"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseForm.unitCost}
                  onChange={e => setPurchaseForm(f => ({ ...f, unitCost: e.target.value }))}
                  placeholder="Unit cost"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                <ArrowDownToLine className="w-4 h-4" />
                Record Purchase
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Product stock report</h2>
            <div className="space-y-2">
              {stockReport.map(item => (
                <div key={item.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{item.productName}</span>
                    <span className="text-emerald-600 font-semibold">{item.onHand} on hand</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-slate-600 dark:text-slate-300">
                    <span>Purchased: {item.purchases}</span>
                    <span>Sold: {item.sales}</span>
                    <span>Returns: {item.returns}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3">Recent stock movements</h2>
            <div className="space-y-2">
              {movements.length === 0 ? (
                <div className="text-xs text-slate-500">No stock movements yet.</div>
              ) : (
                movements.slice(0, 6).map(movement => (
                  <div key={movement.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{movement.productName}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${movement.quantity >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {movement.movementType}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600 dark:text-slate-300">
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity} units · {movement.reference || 'manual'}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {new Date(movement.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
