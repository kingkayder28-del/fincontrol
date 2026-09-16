import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Mail, AlertCircle, Eye, EyeOff, Loader, ShieldCheck, UserRound, RotateCcw, Copy } from 'lucide-react';
import { createRecoveryKeyForUser, createUserPassword, getRecoveryBundleForUser, getRecoveryKeyForUser, loginUser, resetAdminPassword, resetUserPasswordWithRecovery } from '../lib/auth';
import { getStore, saveStore } from '../lib/storage';
import { User, AuthSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: AuthSession, user: User) => void;
  onError?: (error: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onError }) => {
  const store = getStore();
  const setupRequired = store.users.length === 0;
  const [isSetupMode, setIsSetupMode] = useState(setupRequired);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [useEmergencyReset, setUseEmergencyReset] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryCodeDisplay, setRecoveryCodeDisplay] = useState('');
  const [recoveryPhraseDisplay, setRecoveryPhraseDisplay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const currentStore = getStore();
      if (!email.trim()) {
        throw new Error('Enter the account email address.');
      }
      if (newPassword.length < 10) {
        throw new Error('Use a password with at least 10 characters.');
      }
      if (newPassword !== confirmNewPassword) {
        throw new Error('The new passwords do not match.');
      }
      if (!useEmergencyReset && !recoveryCode.trim() && !recoveryPhrase.trim()) {
        throw new Error('Enter the recovery code or recovery phrase.');
      }

      const recoveredUser = useEmergencyReset
        ? await resetAdminPassword(email.trim(), newPassword, currentStore.users)
        : await resetUserPasswordWithRecovery(
            email.trim(),
            newPassword,
            recoveryCode,
            currentStore.users,
            recoveryPhrase
          );
      if (!recoveredUser) {
        throw new Error(useEmergencyReset
          ? 'Emergency admin reset failed. Verify the administrator email and try again.'
          : 'Recovery failed. Check the email and the saved recovery code or recovery phrase.');
      }

      setRecoveryCodeDisplay('');
      setRecoveryPhraseDisplay('');
      currentStore.currentUser = recoveredUser;
      saveStore(currentStore);

      setShowRecovery(false);
      setUseEmergencyReset(false);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setRecoveryCode('');
      setRecoveryPhrase('');
      setError(useEmergencyReset ? 'Admin password reset successful. Please sign in with your new password.' : 'Password reset successfully. Please sign in with your new password.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password recovery failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const currentStore = getStore();

      if (isSetupMode) {
        if (name.trim().length < 2) {
          setError('Enter the administrator\'s full name.');
          setIsLoading(false);
          return;
        }
        if (password.length < 10) {
          setError('Use a password with at least 10 characters.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('The passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (currentStore.users.some(user => user.email.toLowerCase() === email.trim().toLowerCase())) {
          setError('An account with this email already exists.');
          setIsLoading(false);
          return;
        }

        const admin = {
          id: `usr-admin-${Date.now()}`,
          orgId: currentStore.activeOrgId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'admin' as const,
          passwordHash: await createUserPassword(password),
          mfaEnabled: false,
          status: 'active' as const,
          lastLogin: new Date().toISOString()
        };
        currentStore.users = [admin];
        currentStore.currentUser = admin;
        const newRecoveryCode = createRecoveryKeyForUser(admin.email);
        const savedRecovery = getRecoveryBundleForUser(admin.email);
        setRecoveryCodeDisplay(savedRecovery?.code ?? newRecoveryCode);
        setRecoveryPhraseDisplay(savedRecovery?.recoveryPhrase ?? '');
        saveStore(currentStore);
      }

      const result = await loginUser({ email: email.trim(), password, rememberMe }, getStore().users);

      if (!result) {
        setError('Invalid email or password');
        onError?.('Invalid email or password');
        setIsLoading(false);
        return;
      }

      const { session, user } = result;
      onLoginSuccess(session, user);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf2f7] flex items-center justify-center p-4 text-slate-900">
      <div className="pointer-events-none absolute -left-20 top-[-8rem] h-80 w-80 rounded-full bg-[rgba(43,91,138,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[rgba(109,139,177,0.12)] blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-white shadow-[var(--shadow-md)] md:grid-cols-[1.05fr_.95fr]">
        <section className="hidden min-h-[620px] flex-col justify-between border-r border-[var(--line)] bg-[#eef4fb] p-10 text-[var(--text)] md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--brand-soft)] p-3 text-[var(--brand)]"><ShieldCheck className="h-7 w-7" /></div>
              <span className="text-lg font-bold tracking-tight text-[var(--text)]">LedgerNest</span>
            </div>
            <p className="mt-24 max-w-sm text-4xl font-bold leading-tight tracking-[-0.04em] text-[var(--text)]">Your finances, held with care.</p>
            <p className="mt-6 max-w-md text-sm leading-6 text-[var(--text-muted)]">A calm, accountable workspace for organizations that need every number to tell the truth.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]"><CheckCircle2 className="h-4 w-4 text-[var(--brand)]" /> Private workspace access</div>
        </section>

        <div className="bg-[var(--bg-subtle)] px-7 py-9 sm:px-10 sm:py-12">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-100 p-2 text-cyan-700"><ShieldCheck className="h-6 w-6" /></div><span className="text-lg font-bold">LedgerNest</span></div>
          </div>
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[var(--brand)]">Administrator access</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text)]">{isSetupMode ? 'Create your first admin' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{isSetupMode ? 'Set up the account that will protect this workspace.' : 'Sign in to continue to your financial workspace.'}</p>
          </div>

          {/* Form */}
          <form onSubmit={showRecovery ? handleRecovery : handleLogin} className="px-8 py-8 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className={`flex items-start gap-3 p-4 rounded-lg border ${error.toLowerCase().includes('success') ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${error.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-red-600 dark:text-red-400'}`} />
                <p className={error.toLowerCase().includes('success') ? 'text-emerald-800 text-sm' : 'text-red-800 dark:text-red-300 text-sm'}>{error}</p>
              </div>
            )}

            {recoveryCodeDisplay && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Save these recovery details now</p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 font-mono text-xs">
                  <span>{recoveryCodeDisplay}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(recoveryCodeDisplay)}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                {recoveryPhraseDisplay && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px] leading-5 text-amber-900">
                    <div className="font-semibold uppercase tracking-[0.14em] text-[10px] text-amber-700">Recovery phrase</div>
                    <div className="mt-1 font-medium break-words">{recoveryPhraseDisplay}</div>
                  </div>
                )}
              </div>
            )}

            {showRecovery && email.trim() && getRecoveryBundleForUser(email.trim()) && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                <p className="font-semibold">Saved recovery details</p>
                <p className="mt-2 font-mono text-xs">{getRecoveryKeyForUser(email.trim())}</p>
                <p className="mt-2 text-[11px] leading-5">{getRecoveryBundleForUser(email.trim())?.recoveryPhrase}</p>
              </div>
            )}

            {showRecovery && (
              <button
                type="button"
                onClick={() => {
                  setUseEmergencyReset(!useEmergencyReset);
                  setRecoveryCode('');
                  setRecoveryPhrase('');
                  setError(null);
                }}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                {useEmergencyReset ? 'Use saved recovery code instead' : 'I do not have my recovery code or phrase'}
              </button>
            )}

            {!showRecovery && isSetupMode && (
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <div className="relative"><UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" required disabled={isLoading} /></div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {showRecovery ? (
              <>
                {!useEmergencyReset && (
                  <>
                    <div>
                      <label htmlFor="recoveryCode" className="block text-sm font-medium text-slate-700 mb-2">
                        Recovery code
                      </label>
                      <div className="relative">
                        <RotateCcw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          id="recoveryCode"
                          type="text"
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          placeholder="FIN-XXXX-XXXX"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="recoveryPhrase" className="block text-sm font-medium text-slate-700 mb-2">
                        Recovery phrase
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          id="recoveryPhrase"
                          type="text"
                          value={recoveryPhrase}
                          onChange={(e) => setRecoveryPhrase(e.target.value)}
                          placeholder="twelve word backup phrase"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </>
                )}

                {useEmergencyReset && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Emergency admin reset</p>
                    <p className="mt-1">This resets the administrator password only. Your organization data remains intact.</p>
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter a new password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmNewPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm new password</label>
                  <input
                    id="confirmNewPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    required
                    disabled={isLoading}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {isSetupMode && (
                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
                    <input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" required disabled={isLoading} />
                  </div>
                )}

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-slate-700">
                    Remember me on this device
                  </label>
                </div>
              </>
            )}

            {!showRecovery && !isSetupMode && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowRecovery(true);
                }}
                className="text-sm font-medium text-[var(--brand)] underline underline-offset-2 hover:text-[var(--brand-strong)]"
              >
                Forgot password?
              </button>
            )}

            {showRecovery && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowRecovery(false);
                  setUseEmergencyReset(false);
                  setRecoveryCode('');
                  setRecoveryPhrase('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
              >
                Back to sign in
              </button>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {showRecovery ? 'Resetting password...' : isSetupMode ? 'Creating administrator...' : 'Signing in...'}
                </>
              ) : (
                <>{showRecovery ? 'Reset password' : isSetupMode ? 'Create administrator' : 'Sign in'}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </form>

        </div>

        {/* Version Info */}
        <p className="text-center text-slate-400 text-xs mt-6">
          LedgerNest • One workspace for every organization you manage
        </p>
      </div>
    </div>
  );
};
