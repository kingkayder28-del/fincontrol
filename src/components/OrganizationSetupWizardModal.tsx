import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, Building2, Plus, CheckCircle2, ShieldCheck, DollarSign, Palette } from 'lucide-react';
import { Organization, OrgType, CurrencyConfig, Account, User } from '../types';
import { getStore, saveStore, SUPPORTED_CURRENCIES, getRecommendedCategoriesForType, logAudit, openEmailDraft } from '../lib/storage';
import { createUserPassword } from '../lib/auth';
import { THEME_COLORS, type ThemeColorKey } from '../lib/theme';

interface OrganizationSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganizationCreated: (org: Organization) => void;
  currentUser: User;
}

export const OrganizationSetupWizardModal: React.FC<OrganizationSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onOrganizationCreated,
  currentUser
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<OrgType>('NGO');
  const [country, setCountry] = useState('Malawi');
  const [currencyCode, setCurrencyCode] = useState('MWK');
  const [registrationNo, setRegistrationNo] = useState('');
  const [taxId, setTaxId] = useState('');
  const [approvalThreshold, setApprovalThreshold] = useState<number>(1000000);
  const [themeColor, setThemeColor] = useState<ThemeColorKey>('blue');
  const [businessOwnerEmail, setBusinessOwnerEmail] = useState('');
  const [organizationPassword, setOrganizationPassword] = useState('');
  const [businessProducts, setBusinessProducts] = useState([
    { name: '', openingQuantity: '0', unitCost: '0', unitPrice: '0' },
    { name: '', openingQuantity: '0', unitCost: '0', unitPrice: '0' }
  ]);

  const [createInitialAccounts, setCreateInitialAccounts] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Organization name is required.');
    if (organizationPassword.length < 6) return alert('Organization password must be at least 6 characters.');

    const store = getStore();
    const currencyObj = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
    const newOrgId = `org-${Date.now()}`;

    const newOrg: Organization = {
      id: newOrgId,
      name: name.trim(),
      type,
      registrationNo: registrationNo.trim() || undefined,
      taxId: taxId.trim() || undefined,
      country,
      currency: currencyObj,
      fiscalYearStart: '01-01',
      status: 'active',
      approvalThreshold: Number(approvalThreshold || 0),
      themeColor: THEME_COLORS[themeColor].primary,
      accentColor: THEME_COLORS[themeColor].accent,
      businessOwnerEmail: businessOwnerEmail.trim() || undefined,
      passwordHash: await createUserPassword(organizationPassword),
      createdAt: new Date().toISOString()
    };

    // Auto-seed recommended categories for this org type
    const recommendedCategories = getRecommendedCategoriesForType(type, newOrgId);
    store.categories.push(...recommendedCategories);

    if (type === 'Business') {
      const validProducts = businessProducts
        .map(product => ({
          name: product.name.trim(),
          openingQuantity: Number(product.openingQuantity || 0),
          unitCost: Number(product.unitCost || 0),
          unitPrice: Number(product.unitPrice || 0)
        }))
        .filter(product => product.name && product.openingQuantity >= 0);

      if (validProducts.length > 0) {
        const inventoryItems = validProducts.map((product, index) => ({
          id: `inv-${Date.now()}-${index}`,
          orgId: newOrgId,
          productName: product.name,
          sku: product.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || `PROD-${index + 1}`,
          category: 'Business Inventory',
          openingQuantity: product.openingQuantity,
          currentQuantity: product.openingQuantity,
          unitCost: product.unitCost,
          unitPrice: product.unitPrice || product.unitCost,
          reorderLevel: Math.max(1, Math.round(product.openingQuantity * 0.1)),
          lastUpdated: new Date().toISOString(),
          description: 'Product listed during organization setup'
        }));

        store.inventory.push(...inventoryItems);
      }
    }

    // Auto-seed standard accounts if checked
    if (createInitialAccounts) {
      const defaultAccounts: Account[] = [
        {
          id: `acct-cash-${Date.now()}`,
          orgId: newOrgId,
          name: 'Main Petty Cash Desk',
          type: 'cash',
          accountNoIdentifier: '1010-CASH-MAIN',
          currency: currencyObj.code,
          openingBalance: 0,
          currentBalance: 0,
          status: 'active'
        },
        {
          id: `acct-bank-${Date.now()}`,
          orgId: newOrgId,
          name: 'Main Operating Bank Account',
          type: 'bank',
          accountNoIdentifier: '001002003004',
          bankOrProviderName: 'Commercial Bank',
          currency: currencyObj.code,
          openingBalance: 0,
          currentBalance: 0,
          status: 'active'
        },
        {
          id: `acct-momo-${Date.now()}`,
          orgId: newOrgId,
          name: 'Corporate Mobile Money Wallet',
          type: 'mobile_money',
          accountNoIdentifier: '+265-MOMO-01',
          bankOrProviderName: 'Mobile Money Operator',
          currency: currencyObj.code,
          openingBalance: 0,
          currentBalance: 0,
          status: 'active'
        }
      ];
      store.accounts.push(...defaultAccounts);
    }

    // Add org and set as active
    store.organizations.push(newOrg);
    store.activeOrgId = newOrgId;

    saveStore(store);
    logAudit('ORGANIZATION_CREATED', 'Organization', `Created new organization ${newOrg.name} (${type}).`);

    const adminEmails = store.users.filter(user => user.orgId === newOrgId && user.role === 'admin').map(user => user.email);
    openEmailDraft(
      [...adminEmails, currentUser.role === 'admin' ? currentUser.email : '', newOrg.businessOwnerEmail || ''],
      `Organization access created: ${newOrg.name}`,
      `Organization: ${newOrg.name}\nUsername: ${currentUser.email}\nOrganization password: ${organizationPassword}\n\nPlease store this password securely.`
    );

    onOrganizationCreated(newOrg);
    onClose();
  };

  const orgTypes: OrgType[] = [
    'NGO',
    'Government',
    'Business',
    'School',
    'Church',
    'Association',
    'Non-profit',
    'Cooperative',
    'Project',
    'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Setup New Organization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure financial parameters & chart of accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Organization Legal / Operating Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Apex Community Foundation / St. Mark High School"
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Owner Gmail</label>
              <input type="email" value={businessOwnerEmail} onChange={e => setBusinessOwnerEmail(e.target.value)} placeholder="owner@gmail.com" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Organization Password *</label>
              <input type="password" required minLength={6} value={organizationPassword} onChange={e => setOrganizationPassword(e.target.value)} placeholder="At least 6 characters" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organization Entity Type *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as OrgType)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              >
                {orgTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operating Country *
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {type === 'Business' && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Products sold by this business</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">List the products your business sells so inventory updates stay accurate and autocomplete works.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBusinessProducts(prev => [...prev, { name: '', openingQuantity: '0', unitCost: '0', unitPrice: '0' }])}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              </div>

              {businessProducts.map((product, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={product.name}
                    onChange={e => {
                      const updated = [...businessProducts];
                      updated[index].name = e.target.value;
                      setBusinessProducts(updated);
                    }}
                    placeholder="Product name"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="number"
                    min="0"
                    value={product.openingQuantity}
                    onChange={e => {
                      const updated = [...businessProducts];
                      updated[index].openingQuantity = e.target.value;
                      setBusinessProducts(updated);
                    }}
                    placeholder="Opening qty"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.unitCost}
                    onChange={e => {
                      const updated = [...businessProducts];
                      updated[index].unitCost = e.target.value;
                      setBusinessProducts(updated);
                    }}
                    placeholder="Unit cost"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.unitPrice}
                    onChange={e => {
                      const updated = [...businessProducts];
                      updated[index].unitPrice = e.target.value;
                      setBusinessProducts(updated);
                    }}
                    placeholder="Unit price"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base Reporting Currency *
              </label>
              <select
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Approval Threshold Limit *
              </label>
              <input
                type="number"
                required
                value={approvalThreshold}
                onChange={e => setApprovalThreshold(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registration / NGO License No.
              </label>
              <input
                type="text"
                value={registrationNo}
                onChange={e => setRegistrationNo(e.target.value)}
                placeholder="NGO-MW-2026-..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax ID / VAT Registration
              </label>
              <input
                type="text"
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                placeholder="TP-99102-..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* Theme Color Selector */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <Palette className="w-4 h-4" />
              <span>Organization Theme Color</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {(Object.entries(THEME_COLORS) as Array<[ThemeColorKey, typeof THEME_COLORS[ThemeColorKey]]>).map(([key, colorTheme]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeColor(key)}
                  className={`w-full aspect-square rounded-lg transition-all border-2 ${
                    themeColor === key
                      ? 'border-slate-900 dark:border-white scale-105 shadow-lg'
                      : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorTheme.primary }}
                  title={colorTheme.name}
                >
                  {themeColor === key && (
                    <span className="text-white font-bold text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={createInitialAccounts}
                onChange={e => setCreateInitialAccounts(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Auto-seed standard accounts & tailored chart of accounts</span>
            </label>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal pl-6">
              Automatically builds Petty Cash, Bank, and Mobile Money accounts, plus custom income & expense categories tailored specifically for <span className="font-bold">{type}</span> entities.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back / Esc</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-900/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Confirm & Create Organization</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
