import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AdminRecord {
  id: 'ADMIN_001';
  admin_id: 'ADMIN_001';
  username: string;
  email: string;
  password_hash: string;
  role: 'super_admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: 'active';
  session_version: number;
}

export interface SecurityLogEvent {
  id: string;
  event: string;
  timestamp: string;
  ip: string;
  success: boolean;
  details?: string;
}

export interface SessionData {
  token: string;
  admin_id: string;
  createdAt: number;
  expiresAt: number;
  sessionVersion: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin_account.json');
const LOGS_FILE = path.join(DATA_DIR, 'admin_security_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// In-memory active sessions (token -> SessionData)
const activeSessions = new Map<string, SessionData>();

// Rate limiting map: key -> { count: number, firstAttempt: number, lockedUntil?: number }
const loginRateLimit = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// In-memory cache for fast access, backed by disk
let cachedAdmin: AdminRecord | null = null;
let securityLogs: SecurityLogEvent[] = [];

// Initialize data from disk
function loadAdminFromDisk(): AdminRecord | null {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const data = fs.readFileSync(ADMIN_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.admin_id === 'ADMIN_001' && parsed.role === 'super_admin') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading admin file:', err);
  }
  return null;
}

function saveAdminToDisk(admin: AdminRecord | null) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (admin) {
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
    } else if (fs.existsSync(ADMIN_FILE)) {
      fs.unlinkSync(ADMIN_FILE);
    }
  } catch (err) {
    console.error('Error saving admin file:', err);
  }
}

function loadLogsFromDisk(): SecurityLogEvent[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(data) || [];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLogsToDisk(logs: SecurityLogEvent[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(-100), null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

// Initialize cached states
cachedAdmin = loadAdminFromDisk();
if (!cachedAdmin) {
  const defaultAdmin: AdminRecord = {
    id: 'ADMIN_001',
    admin_id: 'ADMIN_001',
    username: 'admin',
    email: 'halderkoushik120@gmail.com',
    password_hash: hashPassword('D@4455'),
    role: 'super_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
    status: 'active',
    session_version: 1
  };
  cachedAdmin = defaultAdmin;
  saveAdminToDisk(defaultAdmin);
} else if (!cachedAdmin.email) {
  cachedAdmin.email = 'halderkoushik120@gmail.com';
  saveAdminToDisk(cachedAdmin);
}
securityLogs = loadLogsFromDisk();

/**
 * Log a security activity event
 */
export function logSecurityActivity(event: string, ip: string, success: boolean, details?: string) {
  const logItem: SecurityLogEvent = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    event,
    timestamp: new Date().toISOString(),
    ip,
    success,
    details
  };
  securityLogs.unshift(logItem);
  if (securityLogs.length > 100) {
    securityLogs = securityLogs.slice(0, 100);
  }
  saveLogsToDisk(securityLogs);
}

/**
 * Password Hashing with scrypt and random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify Password using constant-time equality check
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash) return false;
    const parts = storedHash.split(':');
    if (parts.length === 3 && parts[0] === 'scrypt') {
      const salt = parts[1];
      const originalHash = Buffer.from(parts[2], 'hex');
      const testHash = crypto.scryptSync(password, salt, 64);
      if (originalHash.length !== testHash.length) return false;
      return crypto.timingSafeEqual(originalHash, testHash);
    }
    // Fallback for legacy plain or simple hashes
    return password === storedHash;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Check if the single admin account exists
 */
export function adminExists(): boolean {
  if (!cachedAdmin) {
    cachedAdmin = loadAdminFromDisk();
  }
  return cachedAdmin !== null && cachedAdmin.status === 'active';
}

/**
 * Get current admin record (without password hash)
 */
export function getAdminSafe() {
  const admin = getAdminRecord();
  if (!admin) return null;
  return {
    id: admin.id,
    admin_id: admin.admin_id,
    username: admin.username,
    email: admin.email || 'halderkoushik120@gmail.com',
    role: admin.role,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at,
    status: admin.status,
    session_version: admin.session_version
  };
}

/**
 * Get raw admin record
 */
export function getAdminRecord(): AdminRecord | null {
  if (!cachedAdmin) {
    cachedAdmin = loadAdminFromDisk();
  }
  return cachedAdmin;
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username is required.' };
  }
  if (trimmed.length < 3 || trimmed.length > 32) {
    return { valid: false, error: 'Username must be between 3 and 32 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, hyphens, dots, and underscores.' };
  }
  return { valid: true };
}

/**
 * Enforce strong password requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  // Check for some complexity
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbersOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasLetters || !hasNumbersOrSpecial) {
    return { valid: false, error: 'Password must include both letters and numbers or symbols.' };
  }
  return { valid: true };
}

/**
 * 1. SINGLE ADMIN ACCOUNT RULE:
 * Setup the FIRST and ONLY admin account.
 * Rejects if an admin account already exists.
 */
export function createInitialAdmin(username: string, password: string, ip: string, email?: string): { success: boolean; message: string; admin?: any } {
  if (adminExists()) {
    logSecurityActivity('Attempted Duplicate Admin Registration Rejected', ip, false, `Attempted user: ${username}`);
    throw new Error('Admin account already exists. Registration is disabled.');
  }

  const uCheck = validateUsername(username);
  if (!uCheck.valid) {
    return { success: false, message: uCheck.error! };
  }

  const pCheck = validatePasswordStrength(password);
  if (!pCheck.valid) {
    return { success: false, message: pCheck.error! };
  }

  const now = new Date().toISOString();
  const hashedPassword = hashPassword(password);
  const targetEmail = (email && email.trim().toLowerCase()) || 'halderkoushik120@gmail.com';

  const newAdmin: AdminRecord = {
    id: 'ADMIN_001',
    admin_id: 'ADMIN_001',
    username: username.trim(),
    email: targetEmail,
    password_hash: hashedPassword,
    role: 'super_admin',
    created_at: now,
    updated_at: now,
    last_login_at: null,
    status: 'active',
    session_version: 1
  };

  cachedAdmin = newAdmin;
  saveAdminToDisk(newAdmin);

  logSecurityActivity('Initial Super Admin Account Created', ip, true, `admin_id: ADMIN_001, username: ${newAdmin.username}, email: ${newAdmin.email}`);

  return {
    success: true,
    message: 'Administrator account created successfully.',
    admin: getAdminSafe()
  };
}

/**
 * Check rate limit for an IP
 */
export function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimit.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds: remaining };
  }

  // Reset if window has elapsed
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginRateLimit.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    return { allowed: false, waitSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000) };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginRateLimit.get(ip);
  if (!record) {
    loginRateLimit.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    }
  }
}

export function resetRateLimit(ip: string) {
  loginRateLimit.delete(ip);
}

/**
 * Authenticate Admin Login
 */
export function authenticateAdmin(username: string, password: string, ip: string): { success: boolean; token?: string; error?: string } {
  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    logSecurityActivity('Admin Login Blocked by Rate Limit', ip, false, `Lockout remaining: ${rateLimit.waitSeconds}s`);
    return {
      success: false,
      error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return { success: false, error: 'Admin account does not exist. Please complete initial setup.' };
  }

  // Compare username (case-sensitive or trimmed)
  const isUsernameMatch = admin.username.trim().toLowerCase() === username.trim().toLowerCase();
  const isPasswordMatch = isUsernameMatch && verifyPassword(password, admin.password_hash);

  if (!isUsernameMatch || !isPasswordMatch) {
    recordFailedAttempt(ip);
    logSecurityActivity('Failed Admin Login Attempt', ip, false, `Input user: "${username.slice(0, 15)}"`);
    // Generic error: never reveal whether username or password was incorrect
    return { success: false, error: 'Invalid username or password.' };
  }

  // Success
  resetRateLimit(ip);
  const now = new Date().toISOString();
  admin.last_login_at = now;
  saveAdminToDisk(admin);

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData: SessionData = {
    token,
    admin_id: admin.admin_id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    sessionVersion: admin.session_version
  };
  activeSessions.set(token, sessionData);

  logSecurityActivity('Admin Login Succeeded', ip, true, `User: ${admin.username}, admin_id: ${admin.admin_id}`);

  return { success: true, token };
}

/**
 * Validate session token
 */
export function validateSessionToken(token: string | undefined): { valid: boolean; admin?: any } {
  if (!token) return { valid: false };

  const session = activeSessions.get(token);
  if (!session) return { valid: false };

  // Check expiration
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return { valid: false };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return { valid: false };
  }

  // Verify session version matches (invalidated on logout-all or password change)
  if (session.sessionVersion !== admin.session_version) {
    activeSessions.delete(token);
    return { valid: false };
  }

  return { valid: true, admin: getAdminSafe() };
}

/**
 * Invalidate a specific session (Logout)
 */
export function invalidateSession(token: string | undefined) {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Invalidate ALL sessions (Logout All Sessions)
 */
export function invalidateAllSessions(ip: string): boolean {
  const admin = getAdminRecord();
  if (!admin) return false;

  admin.session_version = (admin.session_version || 1) + 1;
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  activeSessions.clear();
  logSecurityActivity('All Admin Sessions Terminated', ip, true);
  return true;
}

/**
 * Change Admin Username (keeps the SAME single admin account ADMIN_001)
 */
export function changeAdminUsername(currentPassword: string, newUsername: string, ip: string): { success: boolean; message: string; admin?: any } {
  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin account not found.' };
  }

  if (!verifyPassword(currentPassword, admin.password_hash)) {
    logSecurityActivity('Failed Change Username (Bad Current Password)', ip, false);
    return { success: false, message: 'Verification failed: Current password is incorrect.' };
  }

  const uCheck = validateUsername(newUsername);
  if (!uCheck.valid) {
    return { success: false, message: uCheck.error! };
  }

  const oldName = admin.username;
  admin.username = newUsername.trim();
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  logSecurityActivity('Admin Username Changed', ip, true, `Changed from "${oldName}" to "${admin.username}"`);

  return {
    success: true,
    message: `Admin username updated to "${admin.username}" successfully.`,
    admin: getAdminSafe()
  };
}

/**
 * Change Admin Password (keeps the SAME single admin account ADMIN_001)
 */
export function changeAdminPassword(
  currentPassword: string, 
  newPassword: string, 
  confirmPassword: string, 
  ip: string
): { success: boolean; message: string } {
  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin account not found.' };
  }

  if (!verifyPassword(currentPassword, admin.password_hash)) {
    logSecurityActivity('Failed Change Password (Bad Current Password)', ip, false);
    return { success: false, message: 'Verification failed: Current password is incorrect.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'New password and confirmation do not match.' };
  }

  const pCheck = validatePasswordStrength(newPassword);
  if (!pCheck.valid) {
    return { success: false, message: pCheck.error! };
  }

  // Hash new password securely
  admin.password_hash = hashPassword(newPassword);
  admin.session_version = (admin.session_version || 1) + 1; // Invalidate other sessions
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  // Clear older sessions so re-login is required on other devices
  activeSessions.clear();

  logSecurityActivity('Admin Password Changed', ip, true, 'All other sessions invalidated');

  return {
    success: true,
    message: 'Admin password changed successfully. Other sessions have been signed out.'
  };
}

/**
 * Get Security Dashboard Data
 */
export function getAdminSecurityInfo() {
  const admin = getAdminRecord();
  if (!admin) return null;

  return {
    admin_id: admin.admin_id,
    username: admin.username,
    email: admin.email || 'halderkoushik120@gmail.com',
    role: admin.role,
    status: admin.status,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at,
    active_sessions_count: activeSessions.size,
    recent_activity: securityLogs.slice(0, 15)
  };
}

// ==========================================
// FORGOT PASSWORD / ACCOUNT RECOVERY (OWNER)
// ==========================================

interface RecoveryCodeEntry {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

interface ResetTokenEntry {
  email: string;
  expiresAt: number;
}

// Memory stores for password recovery
const recoveryCodes = new Map<string, RecoveryCodeEntry>();
const resetTokens = new Map<string, ResetTokenEntry>();

/**
 * Verify Owner Email directly with server: checks if owner email or unknown email,
 * and if verified, immediately issues a single-use password reset token.
 */
export function verifyOwnerEmailAndIssueToken(inputEmail: string, ip: string): {
  success: boolean;
  verified: boolean;
  resetToken?: string;
  error?: string;
  message?: string;
} {
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      verified: false,
      error: `Too many verification requests. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return {
      success: false,
      verified: false,
      error: 'Administrator account does not exist or has not been initialized.'
    };
  }

  const cleanInput = (inputEmail || '').trim().toLowerCase();
  if (!cleanInput) {
    return {
      success: false,
      verified: false,
      error: 'Please enter owner email address.'
    };
  }

  const registeredEmail = (admin.email || 'halderkoushik120@gmail.com').trim().toLowerCase();

  // Strict check: must match registered administrator email or owner email
  const isMatch = cleanInput === registeredEmail || cleanInput === 'halderkoushik120@gmail.com';

  if (!isMatch) {
    recordFailedAttempt(ip);
    logSecurityActivity('Failed Account Recovery (Unknown Email)', ip, false, `Input email: "${cleanInput.slice(0, 30)}"`);
    return {
      success: false,
      verified: false,
      error: 'Unknown email address. This email is not registered as the Toto Drive owner.'
    };
  }

  resetRateLimit(ip);

  // Verification successful! Issue single-use reset token valid for 15 minutes
  const resetToken = crypto.randomBytes(32).toString('hex');
  resetTokens.set(resetToken, {
    email: cleanInput,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  logSecurityActivity('Owner Email Verified Successfully', ip, true, `Owner Email: ${cleanInput}`);

  return {
    success: true,
    verified: true,
    resetToken,
    message: 'Owner email verified successfully.'
  };
}

/**
 * Step 1: Request Password Recovery OTP using Registered Owner Email
 */
export function requestAdminPasswordReset(inputEmail: string, ip: string): {
  success: boolean;
  message: string;
  email?: string;
  code?: string;
  error?: string;
} {
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: 'Rate limit exceeded.',
      error: `Too many recovery requests. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return {
      success: false,
      message: 'Admin account not initialized.',
      error: 'Administrator account does not exist. Please complete initial setup first.'
    };
  }

  const cleanInput = (inputEmail || '').trim().toLowerCase();
  const registeredEmail = (admin.email || 'halderkoushik120@gmail.com').trim().toLowerCase();

  // Allow match with registered email or master owner email
  const isMatch = cleanInput === registeredEmail || cleanInput === 'halderkoushik120@gmail.com';

  if (!isMatch) {
    recordFailedAttempt(ip);
    logSecurityActivity('Failed Account Recovery (Email Mismatch)', ip, false, `Input email: "${cleanInput.slice(0, 30)}"`);
    return {
      success: false,
      message: 'Email verification failed.',
      error: 'The email entered does not match the registered owner email. Please enter your registered administrator email.'
    };
  }

  resetRateLimit(ip);

  // Generate secure 6-digit numeric OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  recoveryCodes.set(cleanInput, {
    email: cleanInput,
    code,
    expiresAt,
    attempts: 0
  });

  logSecurityActivity('Owner Password Reset OTP Generated', ip, true, `Owner Email: ${cleanInput}`);

  return {
    success: true,
    message: `A 6-digit verification code has been generated for owner email ${cleanInput}.`,
    email: cleanInput,
    code
  };
}

/**
 * Step 2: Verify 6-digit Recovery OTP Code
 */
export function verifyAdminRecoveryCode(inputEmail: string, inputCode: string, ip: string): {
  success: boolean;
  resetToken?: string;
  error?: string;
} {
  const cleanEmail = (inputEmail || '').trim().toLowerCase();
  const cleanCode = (inputCode || '').trim();

  const entry = recoveryCodes.get(cleanEmail);
  if (!entry) {
    return {
      success: false,
      error: 'No active recovery request found for this email. Please request a new verification code.'
    };
  }

  if (Date.now() > entry.expiresAt) {
    recoveryCodes.delete(cleanEmail);
    return {
      success: false,
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  if (entry.code !== cleanCode) {
    entry.attempts += 1;
    if (entry.attempts >= 5) {
      recoveryCodes.delete(cleanEmail);
      recordFailedAttempt(ip);
      logSecurityActivity('Recovery Code Blocked (Excessive Bad Codes)', ip, false, `Email: ${cleanEmail}`);
      return {
        success: false,
        error: 'Too many incorrect attempts. Please request a new verification code.'
      };
    }
    logSecurityActivity('Invalid Recovery Code Entered', ip, false, `Email: ${cleanEmail}`);
    return {
      success: false,
      error: `Invalid verification code. Please check and try again (${5 - entry.attempts} attempts remaining).`
    };
  }

  // Verification successful! Invalidate code and issue single-use resetToken
  recoveryCodes.delete(cleanEmail);
  const resetToken = crypto.randomBytes(32).toString('hex');
  resetTokens.set(resetToken, {
    email: cleanEmail,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  logSecurityActivity('Owner Recovery Code Verified Successfully', ip, true, `Email: ${cleanEmail}`);

  return {
    success: true,
    resetToken
  };
}

/**
 * Step 3: Reset Master Password with Valid Token
 */
export function resetAdminPasswordWithToken(
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
  ip: string
): { success: boolean; message: string; username?: string; error?: string } {
  if (!resetToken) {
    return { success: false, message: 'Invalid token.', error: 'Missing reset authorization token.' };
  }

  const tokenEntry = resetTokens.get(resetToken);
  if (!tokenEntry || Date.now() > tokenEntry.expiresAt) {
    if (tokenEntry) resetTokens.delete(resetToken);
    return {
      success: false,
      message: 'Token expired.',
      error: 'Password reset session has expired. Please verify your owner email again.'
    };
  }

  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin not found.', error: 'Administrator record could not be found.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'Passwords do not match.', error: 'New password and confirmation do not match.' };
  }

  const pCheck = validatePasswordStrength(newPassword);
  if (!pCheck.valid) {
    return { success: false, message: 'Weak password.', error: pCheck.error };
  }

  // Update password with cryptographically secure scrypt hashing
  admin.password_hash = hashPassword(newPassword);
  admin.session_version = (admin.session_version || 1) + 1;
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  // Terminate any old active sessions
  activeSessions.clear();
  resetTokens.delete(resetToken);

  logSecurityActivity('Admin Master Password Reset via Owner Recovery', ip, true, `Account: ${admin.username}, Owner: ${tokenEntry.email}`);

  return {
    success: true,
    message: 'Master administrator password reset successfully! You can now log in with your new password.',
    username: admin.username
  };
}

/**
 * Change Admin Owner Email Address (Authenticated)
 */
export function changeAdminEmail(
  currentPassword: string,
  newEmail: string,
  ip: string
): { success: boolean; message: string; admin?: any } {
  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin account not found.' };
  }

  if (!verifyPassword(currentPassword, admin.password_hash)) {
    logSecurityActivity('Failed Change Email (Bad Password)', ip, false);
    return { success: false, message: 'Verification failed: Current password is incorrect.' };
  }

  const cleanEmail = (newEmail || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  const oldEmail = admin.email;
  admin.email = cleanEmail;
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  logSecurityActivity('Admin Owner Email Changed', ip, true, `From: "${oldEmail}" to "${admin.email}"`);

  return {
    success: true,
    message: `Owner email updated to ${admin.email} successfully.`,
    admin: getAdminSafe()
  };
}
