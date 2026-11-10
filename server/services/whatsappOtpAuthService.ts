import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UserProfile } from '../../src/types';
import { whatsappBerryService } from './whatsappBerryService';

export interface OtpChallenge {
  otpCode: string;
  expiresAt: string;
  attempts: number;
  name: string;
  email: string;
  createdAt: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  phone: string;
  walletBalance: number;
  rating: number;
  totalRides: number;
  avatarUrl: string;
  status: 'active' | 'blocked';
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PASSENGERS_FILE = path.join(DATA_DIR, 'whatsapp_customers.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory + persisted passengers store
const customersMap = new Map<string, CustomerRecord>();
const pendingOtpChallenges = new Map<string, OtpChallenge>();
const lastOtpSentTimestamp = new Map<string, number>();

export const OTP_RESEND_COOLDOWN_MS = 30000; // 30 seconds
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;

// Load persisted customers on boot
function loadPersistedCustomers() {
  try {
    if (fs.existsSync(PASSENGERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PASSENGERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.mobileNumber) {
            customersMap.set(item.mobileNumber, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsAppAuth] Warning loading persisted customers:', err);
  }
}

loadPersistedCustomers();

function saveCustomers() {
  try {
    const list = Array.from(customersMap.values());
    fs.writeFileSync(PASSENGERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WhatsAppAuth] Warning saving customers:', err);
  }
}

/**
 * Register or update customer record in customersMap
 */
export function registerCustomerRecord(user: any) {
  if (!user) return;
  const rawMobile = user.phone || user.mobileNumber;
  const cleanMobile = normalizeMobile(rawMobile);
  if (!cleanMobile || !isValidMobile(cleanMobile)) return;

  const existing = customersMap.get(cleanMobile);
  const updatedRecord: CustomerRecord = {
    id: user.id || existing?.id || `usr_wa_${cleanMobile}`,
    name: user.name || existing?.name || `Passenger ${cleanMobile.slice(-4)}`,
    email: user.email || existing?.email || `${cleanMobile}@totodrive.in`,
    mobileNumber: cleanMobile,
    phone: user.phone || existing?.phone || `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
    walletBalance: user.walletBalance ?? existing?.walletBalance ?? 100,
    rating: user.rating ?? existing?.rating ?? 5.0,
    totalRides: user.totalRides ?? existing?.totalRides ?? 0,
    avatarUrl: user.avatarUrl || existing?.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanMobile}`,
    status: user.status || existing?.status || 'active',
    createdAt: user.createdAt || existing?.createdAt || new Date().toISOString()
  };

  customersMap.set(cleanMobile, updatedRecord);
  saveCustomers();
}

/**
 * Normalizes phone number to 10 digits
 */
export function normalizeMobile(raw: string | undefined | null): string {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  return clean;
}

/**
 * Validates Indian 10-digit mobile number
 */
export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

import { getAllUsersAuthoritative } from '../businessEngine';

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Check if customer already exists
 */
export function checkCustomerExists(rawMobile: string) {
  const cleanMobile = normalizeMobile(rawMobile);
  if (!cleanMobile || !isValidMobile(cleanMobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  let existing = customersMap.get(cleanMobile);
  if (!existing) {
    try {
      const allUsers = getAllUsersAuthoritative();
      const found = allUsers.find((u: any) => {
        const uClean = normalizeMobile(u.phone || u.mobileNumber);
        return uClean === cleanMobile;
      });
      if (found) {
        existing = {
          id: found.id,
          name: found.name || `Passenger ${cleanMobile.slice(-4)}`,
          email: found.email || `${cleanMobile}@totodrive.in`,
          mobileNumber: cleanMobile,
          phone: found.phone || `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
          walletBalance: found.walletBalance ?? 100,
          rating: found.rating ?? 5.0,
          totalRides: found.totalRides ?? 0,
          avatarUrl: found.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanMobile}`,
          status: found.status || 'active',
          createdAt: found.createdAt || new Date().toISOString()
        };
        customersMap.set(cleanMobile, existing);
        saveCustomers();
      }
    } catch (err) {
      // Ignore if engine not initialized
    }
  }

  return {
    success: true,
    exists: Boolean(existing),
    mobileNumber: cleanMobile,
    customer: existing
      ? {
          id: existing.id,
          name: existing.name,
          email: maskEmail(existing.email),
          mobileNumber: cleanMobile
        }
      : null
  };
}

/**
 * Dispatches 6-digit WhatsApp OTP
 */
export async function sendWhatsAppOtp(params: {
  mobileNumber: string;
  name?: string;
  email?: string;
  isNewUser?: boolean;
}) {
  const { mobileNumber, isNewUser } = params;
  const cleanMobile = normalizeMobile(mobileNumber);

  if (!cleanMobile || !isValidMobile(cleanMobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  // Rate Limiting Check
  const lastSent = lastOtpSentTimestamp.get(cleanMobile);
  const now = Date.now();
  if (lastSent && now - lastSent < OTP_RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
    throw new Error(`Please wait ${waitSec} seconds before requesting another WhatsApp OTP.`);
  }

  let existingUser = customersMap.get(cleanMobile);
  if (!existingUser) {
    try {
      const allUsers = getAllUsersAuthoritative();
      const found = allUsers.find((u: any) => {
        const uClean = normalizeMobile(u.phone || u.mobileNumber);
        return uClean === cleanMobile;
      });
      if (found) {
        existingUser = {
          id: found.id,
          name: found.name || `Passenger ${cleanMobile.slice(-4)}`,
          email: found.email || `${cleanMobile}@totodrive.in`,
          mobileNumber: cleanMobile,
          phone: found.phone || `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
          walletBalance: found.walletBalance ?? 100,
          rating: 5.0,
          totalRides: 0,
          avatarUrl: found.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanMobile}`,
          status: 'active',
          createdAt: found.createdAt || new Date().toISOString()
        };
        customersMap.set(cleanMobile, existingUser);
        saveCustomers();
      }
    } catch (e) {}
  }

  const name = (params.name || '').trim();
  const email = (params.email || '').trim().toLowerCase();

  // If registering a new user, check requirements
  if (!existingUser && isNewUser) {
    if (!name) {
      throw new Error('Full name is required for registration.');
    }
  }

  // Generate 6-digit cryptographic OTP code
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(now + OTP_EXPIRY_MS).toISOString();

  // Store challenge
  pendingOtpChallenges.set(cleanMobile, {
    otpCode,
    expiresAt,
    attempts: 0,
    name: name || existingUser?.name || `Passenger ${cleanMobile.slice(-4)}`,
    email: email || existingUser?.email || `${cleanMobile}@totodrive.in`,
    createdAt: now
  });

  lastOtpSentTimestamp.set(cleanMobile, now);

  const customerGreeting = existingUser?.name || name || 'Passenger';
  const whatsappMessage =
    `🔐 TotoDrive Verification Code\n\n` +
    `Hello * ${customerGreeting} *!\n\n` +
    `Your one-time password login OTP is: ${otpCode}\n\n` +
    `⏱ Valid for 5 minutes. Do not share this code with anyone.\n\n` +
    `— TotoDrive Instant Rides`;

  console.log(`[WhatsAppAuth] Dispatched OTP ${otpCode} to WhatsApp +91 ${cleanMobile}`);

  // Dispatch via live WhatsApp Berry Protocol
  const dispatchResult = await whatsappBerryService.sendMessage(cleanMobile, whatsappMessage);

  return {
    success: true,
    message: 'OTP sent to your WhatsApp number.',
    mobileNumber: cleanMobile,
    expiresInSeconds: 300,
    cooldownSeconds: 30,
    devOtp: process.env.NODE_ENV === 'test' ? otpCode : undefined,
    formattedMessage: whatsappMessage,
    dispatch: {
      provider: 'WhatsAppBerryProtocol',
      status: dispatchResult.delivered ? 'DELIVERED' : 'SENT',
      messageId: dispatchResult.id,
      deliveredAt: new Date().toISOString()
    }
  };
}

/**
 * Verifies 6-digit WhatsApp OTP & signs in user
 */
export async function verifyWhatsAppOtp(params: {
  mobileNumber: string;
  otp: string;
  name?: string;
  email?: string;
}): Promise<{
  success: boolean;
  token: string;
  customer: UserProfile;
  isNewUser: boolean;
}> {
  const { mobileNumber, otp } = params;
  const cleanMobile = normalizeMobile(mobileNumber);

  if (!cleanMobile) {
    throw new Error('Invalid mobile number.');
  }

  const cleanOtp = String(otp || '').trim();
  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Please enter the 6-digit WhatsApp verification code.');
  }

  const challenge = pendingOtpChallenges.get(cleanMobile);
  if (!challenge) {
    throw new Error('No active OTP request found. Please request a new OTP.');
  }

  // Attempt throttle guard
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    pendingOtpChallenges.delete(cleanMobile);
    throw new Error('Too many incorrect attempts. Please request a new OTP.');
  }

  // Check Expiry
  if (Date.now() > new Date(challenge.expiresAt).getTime()) {
    pendingOtpChallenges.delete(cleanMobile);
    throw new Error('Verification code has expired. Please request a new OTP.');
  }

  // Check constant-time equality
  const isValid = crypto.timingSafeEqual(
    Buffer.from(challenge.otpCode, 'utf8'),
    Buffer.from(cleanOtp, 'utf8')
  );

  if (!isValid) {
    challenge.attempts += 1;
    throw new Error('Invalid verification code. Please check your WhatsApp and try again.');
  }

  // Verified! Clean up pending challenge
  pendingOtpChallenges.delete(cleanMobile);

  let existing = customersMap.get(cleanMobile);
  let isNewUser = false;

  if (!existing) {
    isNewUser = true;
    const finalName = (params.name || challenge.name || `Passenger ${cleanMobile.slice(-4)}`).trim();
    const finalEmail = (params.email || challenge.email || `${cleanMobile}@totodrive.in`).trim().toLowerCase();

    existing = {
      id: `usr_wa_${cleanMobile}`,
      name: finalName,
      email: finalEmail,
      mobileNumber: cleanMobile,
      phone: `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
      walletBalance: 100, // Welcome signup bonus
      rating: 5.0,
      totalRides: 0,
      avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanMobile}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    customersMap.set(cleanMobile, existing);
    saveCustomers();
  }

  // Generate session token
  const token = `wa_tok_${cleanMobile}_${crypto.randomBytes(16).toString('hex')}`;

  const customerProfile: UserProfile = {
    id: existing.id,
    name: existing.name,
    phone: existing.phone,
    email: existing.email,
    rating: existing.rating || 5.0,
    totalRides: existing.totalRides || 0,
    walletBalance: existing.walletBalance || 0,
    avatarUrl: existing.avatarUrl,
    createdAt: existing.createdAt,
    status: existing.status
  };

  return {
    success: true,
    token,
    customer: customerProfile,
    isNewUser
  };
}

export function deleteCustomerForTest(mobileNumber: string) {
  const clean = normalizeMobile(mobileNumber);
  customersMap.delete(clean);
  pendingOtpChallenges.delete(clean);
  lastOtpSentTimestamp.delete(clean);
  saveCustomers();
}
