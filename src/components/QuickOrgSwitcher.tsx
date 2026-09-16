import React, { useState } from 'react';
import { Building2, Plus, Check, ChevronRight, Palette, LogOut, Lock, ShieldCheck } from 'lucide-react';
import { Organization } from '../types';
import { THEME_COLORS, type ThemeColorKey } from '../lib/theme';
import { createUserPassword, verifyOrganizationPassword } from '../lib/auth';
import { getStore, saveStore } from '../lib/storage';

interface QuickOrgSwitcherProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  onCreateNew: () => void;
  onLogoutOrg?: (orgId: string) => void;
}

export const QuickOrgSwitcher: React.FC<QuickOrgSwitcherProps> = ({
  organizations,
  activeOrg,
  onSelectOrg,
  onCreateNew,
  onLogoutOrg
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState<string | null>(null);
  const [tempThemeColor, setTempThemeColor] = useState<string>(activeOrg.themeColor || '#3b82f6');
  const [securityOrgId, setSecurityOrgId] = useState<string | null>(null);
  const [securityMode, setSecurityMode] = useState<'create' | 'unlock'>('unlock');
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isSubmittingOrgPassword, setIsSubmittingOrgPassword] = useState(false);

  const getOrgInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const openOrgSecurity = (org: Organization, mode: 'create' | 'unlock') => {
    setSecurityOrgId(org.id);
    setSecurityMode(mode);
    setSecurityPassword('');
    setSecurityConfirmPassword('');
    setSecurityError('');
    setIsSubmittingOrgPassword(false);
  };

  const handleOrgSelect = async (org: Organization) => {
    if (!org.passwordHash) {
      openOrgSecurity(org, 'create');
      return;
    }

    openOrgSecurity(org, 'unlock');
  };

  const handleSecuritySubmit = async () => {
    if (!securityOrgId) return;
    const org = organizations.find(item => item.id === securityOrgId);
    if (!org) return;

    const password = securityPassword.trim();
    if (securityMode === 'create') {
      if (password.length < 6) {
        setSecurityError('Organization password must be at least 6 characters.');
        return;
      }
      if (password !== securityConfirmPassword) {
        setSecurityError('Passwords do not match.');
        return;
      }

      setIsSubmittingOrgPassword(true);
      const protectedOrg = { ...org, passwordHash: await createUserPassword(password) };
      const store = getStore();
      const orgIndex = store.organizations.findIndex(item => item.id === org.id);
      if (orgIndex >= 0) store.organizations[orgIndex] = protectedOrg;
      saveStore(store);
      onSelectOrg(protectedOrg);
      setIsOpen(false);
      setShowThemeEditor(null);
      setSecurityOrgId(null);
      setSecurityPassword('');
      setSecurityConfirmPassword('');
      setSecurityError('');
      setIsSubmittingOrgPassword(false);
      return;
    }

    if (!password) {
      setSecurityError('Enter the organization password to continue.');
      return;
    }

    setIsSubmittingOrgPassword(true);
    const isValid = await verifyOrganizationPassword(password, org.passwordHash);
    if (!isValid) {
      setSecurityError('Incorrect organization password. Access denied.');
      setIsSubmittingOrgPassword(false);
      return;
    }

    onSelectOrg(org);
    setIsOpen(false);
    setShowThemeEditor(null);
    setSecurityOrgId(null);
    setSecurityPassword('');
    setSecurityConfirmPassword('');
    setSecurityError('');
    setIsSubmittingOrgPassword(false);
  };

  const handleThemeChange = (org: Organization, newColor: string) => {
    const updatedOrg = { ...org, themeColor: newColor };
    onSelectOrg(updatedOrg);
    setTempThemeColor(newColor);
  };

  const themeColorKeys = Object.keys(THEME_COLORS) as ThemeColorKey[];

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
        title="Switch Organization"
      >
        <div
          className="w-7 h-7 rounded-md text-white font-bold text-xs flex items-center justify-center shadow-sm"
          style={{ backgroundColor: activeOrg.themeColor || '#3b82f6' }}
        >
          {getOrgInitials(activeOrg.name)}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight max-w-[120px] truncate">
            {activeOrg.name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {organizations.length} org{organizations.length !== 1 ? 's' : ''}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {securityOrgId && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-[60] animate-in fade-in slide-in-from-top-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {securityMode === 'create' ? 'Create organization password' : 'Unlock organization'}
              </div>
              <div className="text-[11px] text-slate-500">
                {organizations.find(org => org.id === securityOrgId)?.name}
              </div>
            </div>
          </div>

          {securityError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
              {securityError}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="password"
              value={securityPassword}
              onChange={e => setSecurityPassword(e.target.value)}
              placeholder={securityMode === 'create' ? 'Enter a secure password' : 'Enter organization password'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />

            {securityMode === 'create' && (
              <input
                type="password"
                value={securityConfirmPassword}
                onChange={e => setSecurityConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setSecurityOrgId(null);
                  setSecurityPassword('');
                  setSecurityConfirmPassword('');
                  setSecurityError('');
                }}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingOrgPassword}
                onClick={handleSecuritySubmit}
                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingOrgPassword ? 'Working...' : securityMode === 'create' ? 'Create' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Your Organizations
            </h3>
          </div>

          {/* Organizations List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No organizations yet</p>
              </div>
            ) : (
              organizations.map(org => (
                <div key={org.id} className="space-y-1">
                  <button
                    onClick={() => handleOrgSelect(org)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      org.id === activeOrg.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-md text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: org.themeColor || '#3b82f6' }}
                    >
                      {getOrgInitials(org.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{org.name}</div>
                      <div className="text-xs opacity-75">{org.type} • {org.currency.code}</div>
                    </div>

                    {org.id === activeOrg.id && (
                      <Check className="w-5 h-5 flex-shrink-0" />
                    )}
                  </button>

                  {/* Theme Editor Collapsed */}
                  {showThemeEditor === org.id && (
                    <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 ml-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Organization Theme
                        </span>
                      </div>

                      {/* Color Picker Grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {themeColorKeys.map(colorKey => {
                          const colorTheme = THEME_COLORS[colorKey];
                          const isSelected = (org.themeColor || '#3b82f6') === colorTheme.primary;

                          return (
                            <button
                              key={colorKey}
                              onClick={() => handleThemeChange(org, colorTheme.primary)}
                              className={`w-full aspect-square rounded-lg transition-all border-2 ${
                                isSelected
                                  ? 'border-slate-900 dark:border-white scale-105 shadow-lg'
                                  : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                              }`}
                              style={{ backgroundColor: colorTheme.primary }}
                              title={colorTheme.name}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-white mx-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Theme Toggle Button */}
                  <button
                    onClick={() => setShowThemeEditor(showThemeEditor === org.id ? null : org.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>{showThemeEditor === org.id ? 'Hide' : 'Change'} Theme</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200 dark:border-slate-800 mt-3 pt-3 space-y-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
