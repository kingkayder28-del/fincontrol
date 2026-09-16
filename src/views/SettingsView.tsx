import React, { useRef, useState } from 'react';
import { Settings as SettingsIcon, Building, DollarSign, ShieldCheck, Save, Check, Download, Upload } from 'lucide-react';
import { Organization, User } from '../types';
import { getStore, saveStore, logAudit, SUPPORTED_CURRENCIES, openEmailDraft, downloadOrganizationArchive, importOrganizationArchive } from '../lib/storage';
import { createUserPassword } from '../lib/auth';

interface SettingsViewProps {
  organization: Organization;
  currentUser: User;
  onOrganizationUpdate: (updatedOrg: Organization) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organization,
  currentUser,
  onOrganizationUpdate
}) => {
  const store = getStore();

  const [name, setName] = useState(organization.name);
  const [registrationNo, setRegistrationNo] = useState(organization.registrationNo || '');
  const [taxId, setTaxId] = useState(organization.taxId || '');
  const [physicalAddress, setPhysicalAddress] = useState(organization.physicalAddress || '');
  const [businessOwnerEmail, setBusinessOwnerEmail] = useState(organization.businessOwnerEmail || '');
  const [organizationPassword, setOrganizationPassword] = useState('');
  const [currencyCode, setCurrencyCode] = useState(organization.currency.code);
  const [approvalThreshold, setApprovalThreshold] = useState<number>(organization.approvalThreshold);

  const [receiptPrefix, setReceiptPrefix] = useState('RCPT-');
  const [paymentPrefix, setPaymentPrefix] = useState('PAY-');
  const [transferPrefix, setTransferPrefix] = useState('TRF-');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportArchive = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedOrg = importOrganizationArchive(text);
      onOrganizationUpdate(importedOrg);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      logAudit('ORGANIZATION_IMPORTED', 'Settings', `Imported organization archive for ${importedOrg.name}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to import this organization archive.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (organizationPassword && organizationPassword.length < 6) {
      alert('Organization password must be at least 6 characters.');
      return;
    }

    const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || organization.currency;

    const updatedOrg: Organization = {
      ...organization,
      name: name.trim(),
      registrationNo: registrationNo.trim() || undefined,
      taxId: taxId.trim() || undefined,
      physicalAddress: physicalAddress.trim() || undefined,
      businessOwnerEmail: businessOwnerEmail.trim() || undefined,
      passwordHash: organizationPassword ? await createUserPassword(organizationPassword) : organization.passwordHash,
      currency: newCurrency,
      approvalThreshold: Number(approvalThreshold || 0)
    };

    const orgIdx = store.organizations.findIndex(o => o.id === organization.id);
    if (orgIdx >= 0) {
      store.organizations[orgIdx] = updatedOrg;
    } else {
      store.organizations.push(updatedOrg);
    }
    saveStore(store);
    logAudit('SETTINGS_UPDATED', 'Settings', `Updated organization profile for ${updatedOrg.name}.`);

    if (organizationPassword) {
      openEmailDraft(
        [updatedOrg.businessOwnerEmail || '', currentUser.role === 'admin' ? currentUser.email : ''],
        `Organization password updated: ${updatedOrg.name}`,
        `Organization: ${updatedOrg.name}\nOrganization password: ${organizationPassword}\n\nPlease store this password securely.`
      );
    }

    onOrganizationUpdate(updatedOrg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          <span>Organization Configuration & Financial Policy Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure legal entity details, primary operating currency, approval thresholds & auto-numbering prefixes
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Configuration settings updated and saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        
        {/* Organization Profile */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Legal Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Organization Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registration Number / License</label>
              <input
                type="text"
                value={registrationNo}
                onChange={e => setRegistrationNo(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Identification Number (TIN/VAT)</label>
              <input
                type="text"
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Physical Address / Headquarters</label>
              <input
                type="text"
                value={physicalAddress}
                onChange={e => setPhysicalAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Owner Gmail</label>
              <input type="email" value={businessOwnerEmail} onChange={e => setBusinessOwnerEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Set / Change Organization Password</label>
              <input type="password" minLength={6} value={organizationPassword} onChange={e => setOrganizationPassword(e.target.value)} placeholder="Leave empty to keep current password" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            </div>
          </div>
        </div>

        {/* Currency & Policy Controls */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Currency & Financial Control Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Reporting Currency *</label>
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
                Payment Approval Threshold Limit ({organization.currency.code}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={approvalThreshold}
                onChange={e => setApprovalThreshold(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Payments equal or exceeding this amount require dual-sign-off approval.</p>
            </div>
          </div>
        </div>

        {/* Document Auto-Numbering Prefixes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Document Auto-Numbering Formatting Prefixes</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Voucher Prefix</label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={e => setReceiptPrefix(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Voucher Prefix</label>
              <input
                type="text"
                value={paymentPrefix}
                onChange={e => setPaymentPrefix(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Voucher Prefix</label>
              <input
                type="text"
                value={transferPrefix}
                onChange={e => setTransferPrefix(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Organization Data Backup & Transfer</h3>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Export this organization’s complete data in one file, then import it into a new device or fresh app instance to restore everything exactly.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => downloadOrganizationArchive(organization.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              Export Organization Data
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Upload className="h-4 w-4" />
              Import Organization Data
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportArchive}
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Policy Settings</span>
        </button>

      </form>

    </div>
  );
};
