import { AuthSession, LoginCredentials, User } from '../types';

const AUTH_STORAGE_KEY = 'fincontrol_auth_session';
const RECOVERY_STORAGE_PREFIX = 'fincontrol_recovery_';
const BACKEND_URL = (typeof window !== 'undefined' && (window as any).__FINCONTROL_BACKEND_URL__) || 'http://localhost:4000';

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Hashes passwords with SHA-256 using the browser crypto API.
 * This keeps the app working in a local-first environment without a backend.
 */
async function hashPassword(password: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || !cryptoApi.subtle) {
    throw new Error('Web Crypto API is unavailable in this browser.');
  }

  const data = new TextEncoder().encode(password);
  const hashBuffer = await cryptoApi.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  return (await hashPassword(inputPassword)) === storedHash;
}

/**
 * Generate a mock JWT-like token (in production, use real JWT on backend)
 */
function generateToken(): string {
  return 'token_' + Math.random().toString(36).substr(2, 32) + '_' + Date.now();
}

export function createRecoveryKeyForUser(email: string): string {
  const validEmail = normaliseEmail(email);
  if (!validEmail) {
    throw new Error('An email address is required to create a recovery key.');
  }

  const bytes = new Uint8Array(12);
  globalThis.crypto?.getRandomValues(bytes);
  const code = `FIN-${Array.from(bytes.slice(0, 6), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}-${Array.from(bytes.slice(6), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const payload = {
    email: validEmail,
    code,
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`, JSON.stringify(payload));
  return code;
}

export function getRecoveryKeyForUser(email: string): string | null {
  const validEmail = normaliseEmail(email);
  if (!validEmail) return null;

  try {
    const payload = localStorage.getItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);
    if (!payload) return null;
    return JSON.parse(payload).code ?? null;
  } catch {
    return null;
  }
}

export async function resetUserPasswordWithRecovery(
  email: string,
  newPassword: string,
  recoveryCode: string,
  users: User[]
): Promise<User | null> {
  const validEmail = normaliseEmail(email);
  const trimmedCode = recoveryCode.trim();

  if (!validEmail || !trimmedCode) {
    return null;
  }

  if (typeof window !== 'undefined') {
    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: validEmail, recoveryCode: trimmedCode, newPassword })
    });
    if (!response.ok) return null;
    const result = await response.json() as { user: User };
    return result.user;
  }

  const storedRecovery = localStorage.getItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);
  if (!storedRecovery) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedRecovery);
    if (!parsed || parsed.code !== trimmedCode) {
      return null;
    }
  } catch {
    return null;
  }

  if (newPassword.length < 10) {
    throw new Error('Use a password with at least 10 characters.');
  }

  const user = users.find(u => normaliseEmail(u.email) === validEmail && u.status !== 'suspended');
  if (!user) {
    return null;
  }

  user.passwordHash = await createUserPassword(newPassword);
  localStorage.removeItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);

  return user;
}

/**
 * Login user with email and password
 */
export async function loginUser(
  credentials: LoginCredentials,
  users: User[]
): Promise<{ session: AuthSession; user: User } | null> {
  if (typeof window !== 'undefined') {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) return null;
    return await response.json() as { session: AuthSession; user: User };
  }

  const user = users.find(u => u.email.toLowerCase() === credentials.email.trim().toLowerCase());

  if (!user) {
    return null;
  }

  if (user.status === 'suspended') {
    return null;
  }

  if (!user.passwordHash || !(await verifyPassword(credentials.password, user.passwordHash))) {
    return null;
  }

  // Create session
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour session

  const session: AuthSession = {
    userId: user.id,
    orgId: user.orgId,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    token: generateToken(),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  if (credentials.rememberMe) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return { session, user };
}

export async function bootstrapServerUser(user: User): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const response = await fetch(`${BACKEND_URL}/api/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  if (!response.ok && response.status !== 409) {
    throw new Error('Unable to initialize the secure backend administrator.');
  }
  if (response.status === 409) return null;
  const result = await response.json() as { recoveryCode?: string };
  return result.recoveryCode || null;
}

export async function fetchServerAuthStatus(): Promise<{ setupRequired: boolean }> {
  if (typeof window === 'undefined') return { setupRequired: false };
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`);
    if (!response.ok) return { setupRequired: false };
    const payload = await response.json() as { setupRequired?: boolean } | null;
    return { setupRequired: Boolean(payload?.setupRequired) };
  } catch {
    return { setupRequired: false };
  }
}

/**
 * Get current session from storage
 */
export function getCurrentSession(): AuthSession | null {
  try {
    const sessionStr = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!sessionStr) return null;

    const session: AuthSession = JSON.parse(sessionStr);

    if (new Date(session.expiresAt) < new Date()) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Set current session
 */
export function setCurrentSession(session: AuthSession, rememberMe: boolean = false): void {
  const sessionStr = JSON.stringify(session);

  if (rememberMe) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, sessionStr);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, sessionStr);
}

/**
 * Logout user
 */
export function logoutUser(): void {
  clearSession();
}

/**
 * Clear session from storage
 */
export function clearSession(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

/**
 * Validate session is still valid
 */
export function validateSession(session: AuthSession): boolean {
  if (new Date(session.expiresAt) < new Date()) {
    clearSession();
    return false;
  }
  return true;
}

/**
 * Refresh session expiry time
 */
export function refreshSession(session: AuthSession): AuthSession {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Extend 24 hours

  const refreshedSession: AuthSession = {
    ...session,
    expiresAt: expiresAt.toISOString()
  };

  return refreshedSession;
}

/**
 * Create new user (for admin user creation)
 */
export async function createUserPassword(rawPassword: string): Promise<string> {
  return hashPassword(rawPassword);
}

export async function verifyOrganizationPassword(inputPassword: string, storedHash?: string): Promise<boolean> {
  return Boolean(storedHash) && (await hashPassword(inputPassword)) === storedHash;
}
