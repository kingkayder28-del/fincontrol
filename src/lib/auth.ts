import { AuthSession, LoginCredentials, User } from '../types';

const AUTH_STORAGE_KEY = 'fincontrol_auth_session';
const RECOVERY_STORAGE_PREFIX = 'fincontrol_recovery_';

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateRecoveryPhrase(): string {
  const words = [
    'amber', 'atlas', 'beacon', 'bloom', 'cinder', 'copper', 'delta', 'dune',
    'ember', 'everest', 'field', 'finch', 'glow', 'harbor', 'harmony', 'ivory',
    'juniper', 'lagoon', 'lumen', 'mercy', 'meteor', 'noble', 'oasis', 'orbit',
    'pearl', 'pioneer', 'quartz', 'river', 'summit', 'terra', 'vector', 'willow',
    'zephyr', 'zenith'
  ];

  const phraseWords = Array.from({ length: 12 }, (_, index) => {
    const wordIndex = (index * 7 + Date.now()) % words.length;
    return words[wordIndex];
  });

  return phraseWords.join(' ');
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

  const code = `FIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const recoveryPhrase = generateRecoveryPhrase();
  const payload = {
    email: validEmail,
    code,
    recoveryPhrase,
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

export function getRecoveryBundleForUser(email: string): { code: string; recoveryPhrase: string; createdAt: string } | null {
  const validEmail = normaliseEmail(email);
  if (!validEmail) return null;

  try {
    const payload = localStorage.getItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);
    if (!payload) return null;
    const parsed = JSON.parse(payload);
    if (!parsed?.code || !parsed?.recoveryPhrase) return null;
    return {
      code: parsed.code,
      recoveryPhrase: parsed.recoveryPhrase,
      createdAt: parsed.createdAt
    };
  } catch {
    return null;
  }
}

export async function resetAdminPassword(
  email: string,
  newPassword: string,
  users: User[]
): Promise<User | null> {
  const validEmail = normaliseEmail(email);
  if (!validEmail && users.length === 0) {
    return null;
  }

  if (newPassword.length < 10) {
    throw new Error('Use a password with at least 10 characters.');
  }

  const adminUsers = users.filter(u => u.status !== 'suspended' && u.role === 'admin');
  if (adminUsers.length === 0) {
    return null;
  }

  const exactMatch = adminUsers.find(u => normaliseEmail(u.email) === validEmail);
  const fallbackUser = exactMatch ?? (validEmail ? null : adminUsers[0]) ?? adminUsers[0];
  const user = exactMatch ?? (adminUsers.length === 1 ? adminUsers[0] : fallbackUser);

  if (!user) {
    return null;
  }

  user.passwordHash = await createUserPassword(newPassword);
  if (validEmail) {
    localStorage.removeItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);
  }
  return user;
}

export async function resetUserPasswordWithRecovery(
  email: string,
  newPassword: string,
  recoveryCode: string,
  users: User[],
  recoveryPhrase?: string
): Promise<User | null> {
  const validEmail = normaliseEmail(email);
  const trimmedCode = recoveryCode.trim();
  const trimmedRecoveryPhrase = recoveryPhrase?.trim();

  if (!validEmail || (!trimmedCode && !trimmedRecoveryPhrase)) {
    return null;
  }

  const storedRecovery = localStorage.getItem(`${RECOVERY_STORAGE_PREFIX}${validEmail}`);
  if (!storedRecovery) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedRecovery);
    const matchesCode = Boolean(trimmedCode) && parsed?.code === trimmedCode;
    const matchesPhrase = Boolean(trimmedRecoveryPhrase) && parsed?.recoveryPhrase && parsed.recoveryPhrase.toLowerCase() === trimmedRecoveryPhrase.toLowerCase();

    if (!parsed || (!matchesCode && !matchesPhrase)) {
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

  // Save to localStorage if rememberMe is true
  if (credentials.rememberMe) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return { session, user };
}

/**
 * Get current session from storage
 */
export function getCurrentSession(): AuthSession | null {
  try {
    const sessionStr = sessionStorage.getItem(AUTH_STORAGE_KEY) || 
                       localStorage.getItem(AUTH_STORAGE_KEY);
    if (!sessionStr) {
      const savedStore = localStorage.getItem('fincontrol_pro_data_v2') || sessionStorage.getItem('fincontrol_pro_data_v2_session');
      if (!savedStore) return null;

      const parsedStore = JSON.parse(savedStore) as { activeOrgId?: string; currentUser?: Partial<User>; users?: User[] };
      const currentUser = parsedStore.currentUser;
      const adminUser = parsedStore.users?.find(user => user.role === 'admin' && user.status !== 'suspended') || (currentUser ? {
        id: currentUser.id || 'usr-admin-recovered',
        orgId: currentUser.orgId || parsedStore.activeOrgId || 'org-default-01',
        name: currentUser.name || 'Recovered Admin',
        email: currentUser.email || 'admin@ledgernest.local',
        role: 'admin',
        mfaEnabled: Boolean(currentUser.mfaEnabled),
        status: 'active'
      } as User : null);

      if (!adminUser || !adminUser.email) return null;

      const recoveredSession: AuthSession = {
        userId: adminUser.id,
        orgId: adminUser.orgId || parsedStore.activeOrgId || 'org-default-01',
        userName: adminUser.name,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      setCurrentSession(recoveredSession, true);
      return recoveredSession;
    }

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
    localStorage.setItem(AUTH_STORAGE_KEY, sessionStr);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, sessionStr);
  }
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
