import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { executeWalletTransaction } from './walletService';
import { recordAuditLog } from './auditService';
import { getCaptainById } from './captainService';
import { settleRidePaymentAuthoritative, getEngineState } from '../businessEngine';
import { generateQrSvg } from './qrEngine';

export type PaymentSessionType = 'WALLET_TOPUP' | 'RIDE_PAYMENT';
export type PaymentSessionStatus =
  | 'INITIATED'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'MANUAL_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED'
  | 'REFUNDED';

export interface PaymentReceipt {
  receiptNumber: string;
  orderId: string;
  sessionId: string;
  userId: string;
  rideId?: string;
  type: PaymentSessionType;
  amount: number;
  amountPaise: number;
  currency: string;
  paymentMethod: 'UPI' | 'WALLET' | 'CASH';
  status: PaymentSessionStatus;
  utr?: string;
  payerName?: string;
  date: string;
  breakdown: {
    baseFare: number;
    platformFee: number;
    gstPaise: number;
    netCaptainEarnings?: number;
    total: number;
  };
  merchant: {
    merchantId: string;
    merchantName: string;
    merchantUpiId: string;
  };
}

export interface PaymentRefundRecord {
  refundId: string;
  sessionId: string;
  amount: number;
  refundType: 'wallet' | 'bank_manual';
  refundUtr?: string;
  reason: string;
  adminId: string;
  adminUsername: string;
  refundedAt: string;
}

export interface YouPiPaymentSession {
  id: string; // txn_...
  orderId: string; // WAL_... or RIDE_...
  userId: string;
  type: PaymentSessionType;
  rideId?: string;
  captainId?: string;
  captainUpiId?: string;
  amount: number; // in Rupees
  amountPaise: number; // in Paise minor units (64-bit int)
  currency: string;
  status: PaymentSessionStatus;
  merchantUpiId: string;
  merchantName: string;
  upiIntentUrl: string;
  qrSvg: string;
  merchantDetails?: {
    merchantId: string;
    publishableKey?: string;
    merchantName: string;
    merchantUpiId: string;
    appName: string;
    logoUrl: string;
    contactPhone: string;
    contactEmail: string;
    footerGuarantee: string;
  };
  utrClaim?: string;
  utrSubmittedAt?: string;
  verifiedByAdminId?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  webhookDelivered?: boolean;
  refundDetails?: PaymentRefundRecord;
  receiptDetails?: PaymentReceipt;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const PAYMENTS_FILE = path.join(DATA_DIR, 'youpi_payments.json');

const paymentSessions = new Map<string, YouPiPaymentSession>();
const utrIndex = new Map<string, string>(); // UTR -> transactionId (prevents duplicate UTR replay)
const processedDeliveryIds = new Set<string>(); // Webhook delivery deduplication set

// Active Toto Drive Merchant Configuration
export const YOUPI_CONFIG = {
  merchantId: process.env.YOUPI_MERCHANT_ID || '00000000-0000-0000-0000-000000000001',
  publishableKey: process.env.YOUPI_PUBLISHABLE_KEY || 'yp_live_c65004c566aff70da3ca7c9b0d802268',
  merchantUpiId: process.env.YOUPI_MERCHANT_UPI_ID || '8479022523@ybl',
  merchantName: process.env.YOUPI_MERCHANT_NAME || 'Toto Drive',
  appName: 'Koushik Payment Solutions Pvt Ltd',
  logoUrl: 'https://user52284.na.imgto.link/public/20261105/eac1a1123a13cad4912f612d-toto-drive-logo.avif',
  contactPhone: '08479022523',
  contactEmail: 'halderkoushik120@gmail.com',
  footerGuarantee: '100% Payment Protection by Koushik Payment Solutions Pvt Ltd',
  webhookSecret: process.env.YOUPI_WEBHOOK_SECRET || '985ba1591bf00e2e19fe5007340142bd5e2380632cfd56e46bcf4b4890548169',
  sessionExpiryMins: 15,
  minAmountRupees: 1.00,
  maxAmountRupees: 25000.00
};

// Load existing payments from disk
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(PAYMENTS_FILE)) {
    const raw = fs.readFileSync(PAYMENTS_FILE, 'utf-8');
    const list: YouPiPaymentSession[] = JSON.parse(raw);
    for (const session of list) {
      paymentSessions.set(session.id, session);
      if (session.utrClaim) {
        utrIndex.set(session.utrClaim, session.id);
      }
    }
  }
} catch (err) {
  console.warn('Could not load YouPI payments file:', err);
}

function persistPayments() {
  try {
    const list = Array.from(paymentSessions.values()).slice(-2000);
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist YouPI payments:', err);
  }
}

/**
 * Checks and updates session status if 15-minute window has elapsed without UTR submission
 */
function refreshSessionExpiry(session: YouPiPaymentSession): void {
  if (
    (session.status === 'ACTIVE' || session.status === 'INITIATED') &&
    new Date(session.expiresAt).getTime() < Date.now()
  ) {
    session.status = 'EXPIRED';
    session.updatedAt = new Date().toISOString();
  }
}

/**
 * Creates a new YouPI-PG UPI Checkout Session
 * Handles both Passenger Wallet Topup and Direct Ride Payments
 */
export function createYouPiPaymentSession(params: {
  userId: string;
  amount: number;
  type?: PaymentSessionType;
  rideId?: string;
  captainId?: string;
  orderPrefix?: string;
  notes?: string;
  metadata?: Record<string, any>;
}): YouPiPaymentSession {
  // Strict server-side amount validation
  if (typeof params.amount !== 'number' || isNaN(params.amount) || params.amount <= 0) {
    throw new Error('Payment amount must be a positive number.');
  }

  const roundedAmount = Number(params.amount.toFixed(2));
  if (roundedAmount < YOUPI_CONFIG.minAmountRupees) {
    throw new Error(`Minimum payment amount is ₹${YOUPI_CONFIG.minAmountRupees.toFixed(2)}.`);
  }
  if (roundedAmount > YOUPI_CONFIG.maxAmountRupees) {
    throw new Error(`Maximum payment amount is ₹${YOUPI_CONFIG.maxAmountRupees.toFixed(2)}.`);
  }

  const amountPaise = Math.round(roundedAmount * 100);
  const paymentType: PaymentSessionType = params.rideId ? 'RIDE_PAYMENT' : (params.type || 'WALLET_TOPUP');
  const prefix = params.orderPrefix || (paymentType === 'RIDE_PAYMENT' ? 'RIDE' : 'WAL');

  const sessionId = 'txn_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const orderId = `${prefix}_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + YOUPI_CONFIG.sessionExpiryMins * 60 * 1000);

  // If this is a ride payment, look up Captain's configured UPI details if assigned
  let captainUpiId: string | undefined;
  if (params.captainId) {
    const captain = getCaptainById(params.captainId);
    if (captain?.upiId) {
      captainUpiId = captain.upiId;
    }
  }

  // NPCI standard UPI intent URL directed to Toto Drive Collection VPA
  // (In accordance with YouPI P2P architecture, central account collects funds, then ledger credits captain)
  const noteText = paymentType === 'RIDE_PAYMENT'
    ? `Toto Drive Ride ${params.rideId || orderId}`
    : `Toto Drive Wallet Recharge ${params.userId.slice(-6)}`;
  const note = encodeURIComponent(noteText);
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(YOUPI_CONFIG.merchantUpiId)}&pn=${encodeURIComponent(YOUPI_CONFIG.merchantName)}&am=${roundedAmount.toFixed(2)}&tr=${encodeURIComponent(sessionId)}&tn=${note}&cu=INR`;

  // Generate authentic ISO/IEC 18004 Vector SVG QR code via YouPI QR Engine
  const qrSvg = generateQrSvg(upiIntentUrl, 240, 'M');

  const session: YouPiPaymentSession = {
    id: sessionId,
    orderId,
    userId: params.userId,
    type: paymentType,
    rideId: params.rideId,
    captainId: params.captainId,
    captainUpiId,
    amount: roundedAmount,
    amountPaise,
    currency: 'INR',
    status: 'ACTIVE',
    merchantUpiId: YOUPI_CONFIG.merchantUpiId,
    merchantName: YOUPI_CONFIG.merchantName,
    merchantDetails: {
      merchantId: YOUPI_CONFIG.merchantId,
      publishableKey: YOUPI_CONFIG.publishableKey,
      merchantName: YOUPI_CONFIG.merchantName,
      merchantUpiId: YOUPI_CONFIG.merchantUpiId,
      appName: YOUPI_CONFIG.appName,
      logoUrl: YOUPI_CONFIG.logoUrl,
      contactPhone: YOUPI_CONFIG.contactPhone,
      contactEmail: YOUPI_CONFIG.contactEmail,
      footerGuarantee: YOUPI_CONFIG.footerGuarantee
    },
    upiIntentUrl,
    qrSvg,
    metadata: params.metadata || {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  paymentSessions.set(sessionId, session);
  persistPayments();
  return session;
}

/**
 * Customer submits Bank UTR reference for manual or automated verification
 */
export function submitCustomerUtr(sessionId: string, utr: string): {
  success: boolean;
  error?: string;
  session?: YouPiPaymentSession;
} {
  const session = paymentSessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'Payment session not found.' };
  }

  refreshSessionExpiry(session);

  if (session.status === 'VERIFIED') {
    return { success: false, error: 'Payment is already verified and settled.' };
  }

  if (session.status === 'EXPIRED') {
    return { success: false, error: 'This payment session has expired. Please initiate a new payment.' };
  }

  if (session.status === 'REFUNDED') {
    return { success: false, error: 'Payment was previously refunded.' };
  }

  const cleanUtr = utr.trim().replace(/\s+/g, '');
  // Bank UTR in India is 12 digits (or 16 alphanumeric for some IMPS/NEFT transfers)
  if (cleanUtr.length < 8 || cleanUtr.length > 22) {
    return { success: false, error: 'Invalid UTR format. Please enter the valid 12-digit transaction reference number from your UPI app.' };
  }

  // Prevent duplicate UTR replay attacks across all sessions
  const existingTxnId = utrIndex.get(cleanUtr);
  if (existingTxnId && existingTxnId !== sessionId) {
    return {
      success: false,
      error: 'This UTR has already been submitted for another payment transaction. Replay detected.'
    };
  }

  session.utrClaim = cleanUtr;
  session.utrSubmittedAt = new Date().toISOString();
  session.status = 'MANUAL_REVIEW';
  session.updatedAt = new Date().toISOString();

  utrIndex.set(cleanUtr, sessionId);
  persistPayments();

  return { success: true, session };
}

/**
 * Executes double-entry ledger settlement when a payment session is verified
 */
export function executePaymentSettlement(session: YouPiPaymentSession, adminDetails: {
  adminId: string;
  adminUsername: string;
  notes?: string;
}): boolean {
  if (session.status === 'VERIFIED') {
    return true; // Already settled idempotently
  }

  const now = new Date().toISOString();
  session.status = 'VERIFIED';
  session.verifiedByAdminId = adminDetails.adminId;
  session.verifiedAt = now;
  session.updatedAt = now;

  const utrRef = session.utrClaim || 'BANK_MANUAL';

  if (session.type === 'WALLET_TOPUP') {
    // Credit Passenger Wallet via atomic double-entry ledger
    executeWalletTransaction({
      ownerType: 'user',
      ownerId: session.userId,
      transactionType: 'WALLET_TOPUP',
      amount: session.amount,
      referenceType: 'payment',
      referenceId: session.id,
      description: `UPI Wallet Top-up verified (UTR: ${utrRef})`,
      idempotencyKey: `topup_${session.id}`
    });
  } else if (session.type === 'RIDE_PAYMENT' && session.rideId) {
    // Settle ride authoritative state
    try {
      settleRidePaymentAuthoritative(session.rideId, 'upi');
    } catch (e) {
      console.warn('Error settling authoritative ride:', e);
    }

    // Determine Captain for earnings credit
    let captainId = session.captainId;
    if (!captainId) {
      const state = getEngineState();
      const ride = state.rides[session.rideId];
      if (ride?.driverId) {
        captainId = ride.driverId;
      }
    }

    const platformFee = Number((session.amount * 0.10).toFixed(2)); // 10% commission
    const netCaptainEarnings = Number((session.amount - platformFee).toFixed(2)); // 90% net earnings

    if (captainId) {
      // Credit Captain's Earnings Wallet Ledger
      executeWalletTransaction({
        ownerType: 'captain',
        ownerId: captainId,
        transactionType: 'RIDE_FARE',
        amount: netCaptainEarnings,
        referenceType: 'ride',
        referenceId: session.rideId,
        description: `Ride ${session.rideId} fare earnings (Net 90% of ₹${session.amount.toFixed(2)}, UTR: ${utrRef})`,
        idempotencyKey: `ride_captain_${session.id}`
      });
    }

    // Credit Platform Commission Ledger
    executeWalletTransaction({
      ownerType: 'platform',
      ownerId: 'TOTO_DRIVE_PLATFORM',
      transactionType: 'COMMISSION',
      amount: platformFee,
      referenceType: 'ride',
      referenceId: session.rideId,
      description: `Platform 10% commission on Ride ${session.rideId} (UTR: ${utrRef})`,
      idempotencyKey: `ride_platform_${session.id}`
    });
  }

  // Generate and attach canonical receipt
  session.receiptDetails = generatePaymentReceipt(session);

  recordAuditLog({
    adminId: adminDetails.adminId,
    adminUsername: adminDetails.adminUsername,
    action: session.type === 'WALLET_TOPUP' ? 'WALLET_RECHARGE_VERIFIED' : 'RIDE_PAYMENT_VERIFIED',
    targetResource: 'payment_transaction',
    targetId: session.id,
    details: {
      orderId: session.orderId,
      type: session.type,
      amount: session.amount,
      utr: session.utrClaim,
      rideId: session.rideId,
      notes: adminDetails.notes
    }
  });

  persistPayments();
  return true;
}

/**
 * Admin verifies or rejects submitted UTR after inspecting bank records
 */
export function adminReviewUtr(params: {
  sessionId: string;
  adminId: string;
  adminUsername: string;
  action: 'approve' | 'reject';
  notes?: string;
}): { success: boolean; error?: string; session?: YouPiPaymentSession } {
  const session = paymentSessions.get(params.sessionId);
  if (!session) {
    return { success: false, error: 'Payment session not found.' };
  }

  if (session.status === 'VERIFIED') {
    return { success: false, error: 'Payment is already marked verified and settled.' };
  }

  if (session.status === 'REFUNDED') {
    return { success: false, error: 'Cannot review a refunded payment.' };
  }

  const now = new Date().toISOString();

  if (params.action === 'approve') {
    executePaymentSettlement(session, {
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      notes: params.notes
    });
  } else {
    session.status = 'REJECTED';
    session.rejectionReason = params.notes || 'UTR not reflected in bank account.';
    session.verifiedByAdminId = params.adminId;
    session.verifiedAt = now;
    session.updatedAt = now;

    recordAuditLog({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: 'PAYMENT_UTR_REJECTED',
      targetResource: 'payment_transaction',
      targetId: session.id,
      details: {
        orderId: session.orderId,
        utr: session.utrClaim,
        reason: session.rejectionReason
      }
    });

    persistPayments();
  }

  return { success: true, session };
}

/**
 * Process a Payment Refund
 * Can refund either to Passenger Wallet (instant) or manual bank transfer
 */
export function processPaymentRefund(params: {
  sessionId: string;
  adminId: string;
  adminUsername: string;
  reason: string;
  refundType: 'wallet' | 'bank_manual';
  refundUtr?: string;
  amount?: number;
}): { success: boolean; error?: string; session?: YouPiPaymentSession } {
  const session = paymentSessions.get(params.sessionId);
  if (!session) {
    return { success: false, error: 'Payment session not found.' };
  }

  if (session.status !== 'VERIFIED') {
    return { success: false, error: `Only verified payments can be refunded. Current status is ${session.status}.` };
  }

  const refundAmount = params.amount || session.amount;
  if (refundAmount <= 0 || refundAmount > session.amount) {
    return { success: false, error: `Refund amount must be between ₹1 and ₹${session.amount}.` };
  }

  const now = new Date().toISOString();
  const refundId = 'ref_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');

  if (params.refundType === 'wallet') {
    // Credit passenger wallet
    executeWalletTransaction({
      ownerType: 'user',
      ownerId: session.userId,
      transactionType: 'REFUND',
      amount: refundAmount,
      referenceType: 'payment',
      referenceId: session.id,
      description: `Refund for ${session.orderId}: ${params.reason}`,
      idempotencyKey: `refund_${refundId}`
    });
  } else {
    // Manual bank transfer refund requires valid UTR
    if (!params.refundUtr || params.refundUtr.trim().length < 8) {
      return { success: false, error: 'Valid bank UTR reference is required for manual bank refund.' };
    }
  }

  session.status = 'REFUNDED';
  session.refundDetails = {
    refundId,
    sessionId: session.id,
    amount: refundAmount,
    refundType: params.refundType,
    refundUtr: params.refundUtr,
    reason: params.reason,
    adminId: params.adminId,
    adminUsername: params.adminUsername,
    refundedAt: now
  };
  session.updatedAt = now;

  recordAuditLog({
    adminId: params.adminId,
    adminUsername: params.adminUsername,
    action: 'PAYMENT_REFUND_PROCESSED',
    targetResource: 'payment_transaction',
    targetId: session.id,
    details: {
      orderId: session.orderId,
      refundAmount,
      refundType: params.refundType,
      refundUtr: params.refundUtr,
      reason: params.reason
    }
  });

  persistPayments();
  return { success: true, session };
}

/**
 * Generates an authoritative digital receipt
 */
export function generatePaymentReceipt(session: YouPiPaymentSession): PaymentReceipt {
  const baseFare = session.type === 'RIDE_PAYMENT' ? Number((session.amount * 0.90).toFixed(2)) : session.amount;
  const platformFee = session.type === 'RIDE_PAYMENT' ? Number((session.amount * 0.10).toFixed(2)) : 0;
  const gstPaise = Math.round(platformFee * 0.18 * 100);

  return {
    receiptNumber: `RCP-${session.orderId}`,
    orderId: session.orderId,
    sessionId: session.id,
    userId: session.userId,
    rideId: session.rideId,
    type: session.type,
    amount: session.amount,
    amountPaise: session.amountPaise,
    currency: session.currency,
    paymentMethod: 'UPI',
    status: session.status,
    utr: session.utrClaim,
    date: session.verifiedAt || session.createdAt,
    breakdown: {
      baseFare,
      platformFee,
      gstPaise,
      netCaptainEarnings: session.type === 'RIDE_PAYMENT' ? baseFare : undefined,
      total: session.amount
    },
    merchant: {
      merchantId: YOUPI_CONFIG.merchantId,
      merchantName: YOUPI_CONFIG.merchantName,
      merchantUpiId: YOUPI_CONFIG.merchantUpiId
    }
  };
}

/**
 * Verifies HMAC-SHA256 signature for incoming YouPI-PG webhooks
 * Supports:
 * - X-Gateway-Signature: sha256=<hex>
 * - X-Gateway-Signature-V2: sha256=<hex> (timestamped)
 * - X-YouPI-Signature: <hex>
 */
export function verifyYouPiWebhookSignature(
  rawBody: string | Buffer,
  receivedSignature: string,
  timestamp?: string
): boolean {
  if (!receivedSignature || !rawBody) return false;
  try {
    const cleanSig = receivedSignature.replace(/^sha256=/, '').trim();
    const secret = YOUPI_CONFIG.webhookSecret;

    // Check V1 raw body signature
    const hmacV1 = crypto.createHmac('sha256', secret);
    hmacV1.update(rawBody);
    const expectedSigV1 = hmacV1.digest('hex');

    if (
      cleanSig.length === expectedSigV1.length &&
      crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSigV1))
    ) {
      return true;
    }

    // Check V2 timestamped signature if timestamp provided
    if (timestamp) {
      const hmacV2 = crypto.createHmac('sha256', secret);
      hmacV2.update(`${timestamp}.${rawBody.toString()}`);
      const expectedSigV2 = hmacV2.digest('hex');
      if (
        cleanSig.length === expectedSigV2.length &&
        crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSigV2))
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Handle incoming verified webhook with deduplication and idempotency
 */
export function handleYouPiWebhook(params: {
  deliveryId?: string;
  event: string;
  payload: any;
}): { success: boolean; message: string; duplicate?: boolean } {
  const { deliveryId, event, payload } = params;

  // Deduplicate by deliveryId
  if (deliveryId) {
    if (processedDeliveryIds.has(deliveryId)) {
      return { success: true, message: 'Delivery already processed.', duplicate: true };
    }
    processedDeliveryIds.add(deliveryId);
  }

  const paymentId = payload.paymentId || payload.sessionId || payload.id;
  const session = paymentSessions.get(paymentId);
  if (!session) {
    return { success: false, message: `Session ${paymentId} not found.` };
  }

  if (event === 'SUCCESS' || event === 'PAYMENT_VERIFIED') {
    if (payload.utr && !session.utrClaim) {
      session.utrClaim = payload.utr;
      utrIndex.set(payload.utr, session.id);
    }

    executePaymentSettlement(session, {
      adminId: 'YOUPI_WEBHOOK_OBSERVER',
      adminUsername: 'YouPI Observer Engine',
      notes: `Verified via Signed Webhook (UTR: ${payload.utr || 'OBSERVED'})`
    });

    session.webhookDelivered = true;
    persistPayments();
    return { success: true, message: 'Payment successfully settled.' };
  }

  if (event === 'FAILED' || event === 'EXPIRED' || event === 'CANCELLED') {
    if (session.status !== 'VERIFIED' && session.status !== 'REFUNDED') {
      session.status = event as PaymentSessionStatus;
      session.updatedAt = new Date().toISOString();
      persistPayments();
    }
    return { success: true, message: `Payment state updated to ${event}.` };
  }

  return { success: true, message: `Unhandled event ${event}.` };
}

/**
 * Retrieve session details
 */
export function getYouPiSession(sessionId: string): YouPiPaymentSession | null {
  const session = paymentSessions.get(sessionId);
  if (session) {
    refreshSessionExpiry(session);
  }
  return session || null;
}

/**
 * Query payments list for Electron Admin inspection
 */
export function getAllPaymentSessions(filter?: {
  status?: string;
  userId?: string;
  type?: PaymentSessionType;
  limit?: number;
}): YouPiPaymentSession[] {
  let list = Array.from(paymentSessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const s of list) {
    refreshSessionExpiry(s);
  }

  if (filter?.status) {
    list = list.filter(s => s.status === filter.status);
  }
  if (filter?.userId) {
    list = list.filter(s => s.userId === filter.userId);
  }
  if (filter?.type) {
    list = list.filter(s => s.type === filter.type);
  }

  return list.slice(0, filter?.limit || 200);
}

/**
 * Financial Reconciliation Summary for Payments & UTR Audit
 */
export function getPaymentReconciliationSummary(): {
  totalSessions: number;
  totalVolumeRupees: number;
  verifiedCount: number;
  verifiedVolumeRupees: number;
  pendingReviewCount: number;
  pendingReviewVolumeRupees: number;
  rejectedCount: number;
  refundedCount: number;
  refundedVolumeRupees: number;
  activeCount: number;
  expiredCount: number;
  byType: {
    walletTopups: { count: number; volumeRupees: number };
    ridePayments: { count: number; volumeRupees: number };
  };
} {
  const sessions = Array.from(paymentSessions.values());
  for (const s of sessions) refreshSessionExpiry(s);

  let totalVolumeRupees = 0;
  let verifiedCount = 0;
  let verifiedVolumeRupees = 0;
  let pendingReviewCount = 0;
  let pendingReviewVolumeRupees = 0;
  let rejectedCount = 0;
  let refundedCount = 0;
  let refundedVolumeRupees = 0;
  let activeCount = 0;
  let expiredCount = 0;

  const byType = {
    walletTopups: { count: 0, volumeRupees: 0 },
    ridePayments: { count: 0, volumeRupees: 0 }
  };

  for (const s of sessions) {
    totalVolumeRupees += s.amount;
    if (s.type === 'WALLET_TOPUP') {
      byType.walletTopups.count++;
      if (s.status === 'VERIFIED') byType.walletTopups.volumeRupees += s.amount;
    } else {
      byType.ridePayments.count++;
      if (s.status === 'VERIFIED') byType.ridePayments.volumeRupees += s.amount;
    }

    switch (s.status) {
      case 'VERIFIED':
        verifiedCount++;
        verifiedVolumeRupees += s.amount;
        break;
      case 'MANUAL_REVIEW':
        pendingReviewCount++;
        pendingReviewVolumeRupees += s.amount;
        break;
      case 'REJECTED':
        rejectedCount++;
        break;
      case 'REFUNDED':
        refundedCount++;
        refundedVolumeRupees += s.refundDetails?.amount || s.amount;
        break;
      case 'ACTIVE':
      case 'PROCESSING':
        activeCount++;
        break;
      case 'EXPIRED':
      case 'FAILED':
        expiredCount++;
        break;
    }
  }

  return {
    totalSessions: sessions.length,
    totalVolumeRupees: Number(totalVolumeRupees.toFixed(2)),
    verifiedCount,
    verifiedVolumeRupees: Number(verifiedVolumeRupees.toFixed(2)),
    pendingReviewCount,
    pendingReviewVolumeRupees: Number(pendingReviewVolumeRupees.toFixed(2)),
    rejectedCount,
    refundedCount,
    refundedVolumeRupees: Number(refundedVolumeRupees.toFixed(2)),
    activeCount,
    expiredCount,
    byType: {
      walletTopups: {
        count: byType.walletTopups.count,
        volumeRupees: Number(byType.walletTopups.volumeRupees.toFixed(2))
      },
      ridePayments: {
        count: byType.ridePayments.count,
        volumeRupees: Number(byType.ridePayments.volumeRupees.toFixed(2))
      }
    }
  };
}
