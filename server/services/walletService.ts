import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface WalletRecord {
  id: string;
  ownerType: 'user' | 'captain' | 'platform';
  ownerId: string;
  balance: number;
  currency: string;
  status: 'active' | 'frozen';
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  transactionType: 'RIDE_FARE' | 'COMMISSION' | 'WALLET_TOPUP' | 'WITHDRAWAL' | 'REFUND' | 'INCENTIVE' | 'PENALTY';
  amount: number; // positive for credit, negative for debit
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: 'ride' | 'payment' | 'withdrawal' | 'admin';
  referenceId?: string;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets_ledger.json');

interface WalletState {
  wallets: Record<string, WalletRecord>; // walletId -> WalletRecord
  ownerToWallet: Record<string, string>; // ownerType:ownerId -> walletId
  entries: LedgerEntry[];
  processedIdempotencyKeys: Set<string>;
}

const state: WalletState = {
  wallets: {},
  ownerToWallet: {},
  entries: [],
  processedIdempotencyKeys: new Set()
};

// Initialize platform fleet wallet
function ensurePlatformWallet() {
  const platformKey = 'platform:TOTO_DRIVE_PLATFORM';
  if (!state.ownerToWallet[platformKey]) {
    const walletId = 'wal_platform_master';
    state.wallets[walletId] = {
      id: walletId,
      ownerType: 'platform',
      ownerId: 'TOTO_DRIVE_PLATFORM',
      balance: 10000.00,
      currency: 'INR',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.ownerToWallet[platformKey] = walletId;
  }
}

// Load on startup
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(WALLETS_FILE)) {
    const raw = fs.readFileSync(WALLETS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    state.wallets = parsed.wallets || {};
    state.ownerToWallet = parsed.ownerToWallet || {};
    state.entries = parsed.entries || [];
    state.processedIdempotencyKeys = new Set(parsed.processedIdempotencyKeys || []);
  }
  ensurePlatformWallet();
} catch (err) {
  console.warn('Could not load wallet file:', err);
  ensurePlatformWallet();
}

function persistWalletState() {
  try {
    const payload = {
      wallets: state.wallets,
      ownerToWallet: state.ownerToWallet,
      entries: state.entries.slice(-5000), // Retain recent 5000 entries
      processedIdempotencyKeys: Array.from(state.processedIdempotencyKeys).slice(-2000)
    };
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist wallet state:', err);
  }
}

/**
 * Get or create wallet for an owner
 */
export function getOrCreateWallet(ownerType: 'user' | 'captain' | 'platform', ownerId: string): WalletRecord {
  const key = `${ownerType}:${ownerId}`;
  let walletId = state.ownerToWallet[key];

  if (!walletId || !state.wallets[walletId]) {
    walletId = `wal_${ownerType}_${ownerId}`;
    const initialBalance = ownerType === 'user' ? 250.00 : 0.00; // Sign-up welcome wallet credit for passengers
    const record: WalletRecord = {
      id: walletId,
      ownerType,
      ownerId,
      balance: initialBalance,
      currency: 'INR',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.wallets[walletId] = record;
    state.ownerToWallet[key] = walletId;

    if (initialBalance > 0) {
      state.entries.push({
        id: 'led_' + crypto.randomBytes(8).toString('hex'),
        walletId,
        transactionType: 'INCENTIVE',
        amount: initialBalance,
        balanceBefore: 0,
        balanceAfter: initialBalance,
        referenceType: 'admin',
        referenceId: 'WELCOME_BONUS',
        description: 'Toto Drive Welcome Ride Credit',
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
      });
    }

    persistWalletState();
  }

  return state.wallets[walletId];
}

/**
 * Atomic double-entry financial transaction
 */
export function executeWalletTransaction(params: {
  ownerType: 'user' | 'captain' | 'platform';
  ownerId: string;
  transactionType: 'RIDE_FARE' | 'COMMISSION' | 'WALLET_TOPUP' | 'WITHDRAWAL' | 'REFUND' | 'INCENTIVE' | 'PENALTY';
  amount: number; // positive for credit, negative for debit
  description: string;
  referenceType?: 'ride' | 'payment' | 'withdrawal' | 'admin';
  referenceId?: string;
  idempotencyKey?: string;
}): { success: boolean; error?: string; ledgerEntry?: LedgerEntry; newBalance?: number } {
  const { ownerType, ownerId, transactionType, amount, description, referenceType, referenceId, idempotencyKey } = params;

  // Idempotency check
  if (idempotencyKey) {
    if (state.processedIdempotencyKeys.has(idempotencyKey)) {
      return { success: false, error: 'Transaction already processed (idempotency duplicate).' };
    }
  }

  const wallet = getOrCreateWallet(ownerType, ownerId);

  if (wallet.status !== 'active') {
    return { success: false, error: `Wallet is currently ${wallet.status}.` };
  }

  const balanceBefore = Number(wallet.balance.toFixed(2));
  const numericAmount = Number(amount.toFixed(2));
  const balanceAfter = Number((balanceBefore + numericAmount).toFixed(2));

  // Enforce non-negative wallet balance (except authorized credit lines)
  if (balanceAfter < 0 && ownerType !== 'platform') {
    return {
      success: false,
      error: `Insufficient wallet balance. Current: ₹${balanceBefore}, Required deduction: ₹${Math.abs(numericAmount)}`
    };
  }

  // Update wallet
  wallet.balance = balanceAfter;
  wallet.updatedAt = new Date().toISOString();

  // Create immutable ledger entry
  const ledgerEntry: LedgerEntry = {
    id: 'led_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
    walletId: wallet.id,
    transactionType,
    amount: numericAmount,
    balanceBefore,
    balanceAfter,
    referenceType,
    referenceId,
    description,
    status: 'COMPLETED',
    createdAt: new Date().toISOString()
  };

  state.entries.push(ledgerEntry);

  if (idempotencyKey) {
    state.processedIdempotencyKeys.add(idempotencyKey);
  }

  persistWalletState();

  return {
    success: true,
    ledgerEntry,
    newBalance: balanceAfter
  };
}

/**
 * Get wallet ledger history for an owner
 */
export function getWalletLedger(ownerType: 'user' | 'captain' | 'platform', ownerId: string): {
  wallet: WalletRecord;
  entries: LedgerEntry[];
} {
  const wallet = getOrCreateWallet(ownerType, ownerId);
  const entries = state.entries
    .filter(e => e.walletId === wallet.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { wallet, entries };
}
