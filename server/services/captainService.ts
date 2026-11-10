import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { recordAuditLog } from './auditService';

export type DocumentType =
  | 'DRIVING_LICENSE'
  | 'VEHICLE_RC'
  | 'INSURANCE'
  | 'COMMERCIAL_PERMIT'
  | 'AADHAAR';

export type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface CaptainDocument {
  id: string;
  captainId: string;
  documentType: DocumentType;
  documentNumber?: string;
  documentUrl: string;
  expiryDate?: string;
  verificationStatus: DocumentStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaptainOnboardingRecord {
  id: string; // drv_...
  name: string;
  phone: string;
  pinHash: string;
  pinPlain?: string; // Temporarily returned on initial onboarding for user convenience
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  isOnline: boolean;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  rating: number;
  batteryPercentage: number;
  totalTrips: number;
  todayEarnings: number;
  walletBalance: number;
  vehicle: {
    vehicleType: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
    registrationNumber: string;
    model: string;
    color: string;
    capacity: number;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  };
  documents: CaptainDocument[];
  upiId?: string;
  payoutAccountHolder?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  currentLat?: number;
  currentLng?: number;
  heading?: number;
  speed?: number;
  lastLocationUpdate?: number;
  adminNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CAPTAINS_FILE = path.join(DATA_DIR, 'captains_registry.json');

const captains = new Map<string, CaptainOnboardingRecord>();

// Pre-load default seeded drivers if file does not exist
function seedDefaultCaptains() {
  if (captains.size === 0) {
    const seed1: CaptainOnboardingRecord = {
      id: 'drv_1',
      name: 'Raju Karmakar',
      phone: '+919874522019',
      pinHash: crypto.createHash('sha256').update('1234').digest('hex'),
      approvalStatus: 'approved',
      isOnline: true,
      availability: 'AVAILABLE',
      rating: 4.92,
      batteryPercentage: 88,
      totalTrips: 342,
      todayEarnings: 680,
      walletBalance: 1250.00,
      vehicle: {
        vehicleType: 'toto',
        registrationNumber: 'WB-24-ER-2041',
        model: 'Mayuri Deluxe Li-ion E-Rickshaw',
        color: 'Emerald Green',
        capacity: 4,
        verificationStatus: 'VERIFIED'
      },
      documents: [
        {
          id: 'doc_1',
          captainId: 'drv_1',
          documentType: 'DRIVING_LICENSE',
          documentNumber: 'WB-DL-2021004120',
          documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136',
          expiryDate: '2031-12-31',
          verificationStatus: 'VERIFIED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      upiId: 'raju.karmakar@icici',
      payoutAccountHolder: 'Raju Karmakar',
      bankAccountNumber: '50100492817291',
      bankIfsc: 'HDFC0001024',
      currentLat: 22.5855,
      currentLng: 88.4230,
      heading: 45,
      speed: 18,
      lastLocationUpdate: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const seed2: CaptainOnboardingRecord = {
      id: 'drv_2',
      name: 'Subhash Das',
      phone: '+919830244102',
      pinHash: crypto.createHash('sha256').update('1234').digest('hex'),
      approvalStatus: 'approved',
      isOnline: true,
      availability: 'AVAILABLE',
      rating: 4.88,
      batteryPercentage: 74,
      totalTrips: 512,
      todayEarnings: 940,
      walletBalance: 2100.00,
      vehicle: {
        vehicleType: 'toto',
        registrationNumber: 'WB-24-ER-5510',
        model: 'Saarthi Star E-Rickshaw',
        color: 'Canary Yellow',
        capacity: 4,
        verificationStatus: 'VERIFIED'
      },
      documents: [],
      currentLat: 22.5892,
      currentLng: 88.4285,
      heading: 120,
      speed: 15,
      lastLocationUpdate: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    captains.set(seed1.id, seed1);
    captains.set(seed2.id, seed2);
  }
}

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(CAPTAINS_FILE)) {
    const raw = fs.readFileSync(CAPTAINS_FILE, 'utf-8');
    const list: CaptainOnboardingRecord[] = JSON.parse(raw);
    for (const c of list) {
      captains.set(c.id, c);
    }
  }
  seedDefaultCaptains();
} catch (err) {
  console.warn('Could not load captains file:', err);
  seedDefaultCaptains();
}

function persistCaptains() {
  try {
    fs.writeFileSync(CAPTAINS_FILE, JSON.stringify(Array.from(captains.values()), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist captains:', err);
  }
}

/**
 * Register a new Captain onboarding candidate
 */
export function registerCaptainOnboarding(params: {
  name: string;
  phone: string;
  pin?: string;
  vehicleType?: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor?: string;
  capacity?: number;
  documents?: {
    documentType: DocumentType;
    documentNumber?: string;
    documentUrl: string;
    expiryDate?: string;
  }[];
}): CaptainOnboardingRecord {
  const cleanPhone = params.phone.replace(/[^\d+]/g, '');
  const id = 'drv_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  const rawPin = params.pin || String(crypto.randomInt(100000, 999999));
  const pinHash = crypto.createHash('sha256').update(rawPin).digest('hex');

  const docs: CaptainDocument[] = (params.documents || []).map(d => ({
    id: 'doc_' + crypto.randomBytes(6).toString('hex'),
    captainId: id,
    documentType: d.documentType,
    documentNumber: d.documentNumber,
    documentUrl: d.documentUrl,
    expiryDate: d.expiryDate,
    verificationStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  const record: CaptainOnboardingRecord = {
    id,
    name: params.name.trim(),
    phone: cleanPhone,
    pinHash,
    pinPlain: rawPin,
    approvalStatus: 'pending',
    isOnline: false,
    availability: 'OFFLINE',
    rating: 5.0,
    batteryPercentage: 95,
    totalTrips: 0,
    todayEarnings: 0,
    walletBalance: 0,
    vehicle: {
      vehicleType: (params.vehicleType as any) || 'toto',
      registrationNumber: params.vehicleNumber.trim().toUpperCase(),
      model: params.vehicleModel.trim(),
      color: params.vehicleColor || 'Emerald Green',
      capacity: params.capacity || 4,
      verificationStatus: 'PENDING'
    },
    documents: docs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  captains.set(id, record);
  persistCaptains();

  recordAuditLog({
    action: 'CAPTAIN_REGISTRATION_SUBMITTED',
    targetResource: 'captain_profile',
    targetId: id,
    details: {
      name: record.name,
      phone: record.phone,
      vehicleNumber: record.vehicle.registrationNumber
    }
  });

  return record;
}

/**
 * Add a new structured document to Captain profile
 */
export function addCaptainDocument(captainId: string, doc: {
  documentType: DocumentType;
  documentNumber?: string;
  documentUrl: string;
  expiryDate?: string;
}): { success: boolean; error?: string; document?: CaptainDocument } {
  const captain = captains.get(captainId);
  if (!captain) {
    return { success: false, error: 'Captain not found.' };
  }

  const newDoc: CaptainDocument = {
    id: 'doc_' + crypto.randomBytes(6).toString('hex'),
    captainId,
    documentType: doc.documentType,
    documentNumber: doc.documentNumber,
    documentUrl: doc.documentUrl,
    expiryDate: doc.expiryDate,
    verificationStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  captain.documents.push(newDoc);
  captain.updatedAt = new Date().toISOString();
  persistCaptains();

  return { success: true, document: newDoc };
}

/**
 * Admin reviews a captain document
 */
export function reviewCaptainDocument(params: {
  documentId: string;
  adminId: string;
  adminUsername: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}): { success: boolean; error?: string; document?: CaptainDocument } {
  let targetDoc: CaptainDocument | undefined;
  let targetCaptain: CaptainOnboardingRecord | undefined;

  for (const captain of captains.values()) {
    const doc = captain.documents.find(d => d.id === params.documentId);
    if (doc) {
      targetDoc = doc;
      targetCaptain = captain;
      break;
    }
  }

  if (!targetDoc || !targetCaptain) {
    return { success: false, error: 'Document not found.' };
  }

  const now = new Date().toISOString();
  if (params.action === 'approve') {
    targetDoc.verificationStatus = 'VERIFIED';
    targetDoc.verifiedAt = now;
    targetDoc.verifiedBy = params.adminUsername;
    targetDoc.rejectionReason = undefined;
  } else {
    targetDoc.verificationStatus = 'REJECTED';
    targetDoc.verifiedAt = now;
    targetDoc.verifiedBy = params.adminUsername;
    targetDoc.rejectionReason = params.rejectionReason || 'Document unreadable or invalid';
  }

  targetDoc.updatedAt = now;
  targetCaptain.updatedAt = now;
  persistCaptains();

  recordAuditLog({
    adminId: params.adminId,
    adminUsername: params.adminUsername,
    action: `DOCUMENT_${params.action.toUpperCase()}`,
    targetResource: 'captain_document',
    targetId: targetDoc.id,
    details: {
      captainId: targetCaptain.id,
      documentType: targetDoc.documentType,
      reason: params.rejectionReason
    }
  });

  return { success: true, document: targetDoc };
}

/**
 * Admin approves or rejects Captain profile
 */
export function setCaptainApprovalStatus(params: {
  captainId: string;
  adminId: string;
  adminUsername: string;
  action: 'approve' | 'reject' | 'suspend';
  notes?: string;
}): { success: boolean; error?: string; captain?: CaptainOnboardingRecord } {
  const captain = captains.get(params.captainId);
  if (!captain) {
    return { success: false, error: 'Captain not found.' };
  }

  const now = new Date().toISOString();

  if (params.action === 'approve') {
    captain.approvalStatus = 'approved';
    captain.vehicle.verificationStatus = 'VERIFIED';
    captain.approvedAt = now;
    captain.approvedBy = params.adminUsername;
    captain.adminNotes = params.notes;
  } else if (params.action === 'reject') {
    captain.approvalStatus = 'rejected';
    captain.isOnline = false;
    captain.availability = 'OFFLINE';
    captain.adminNotes = params.notes || 'Application criteria not met';
  } else if (params.action === 'suspend') {
    captain.approvalStatus = 'suspended';
    captain.isOnline = false;
    captain.availability = 'OFFLINE';
    captain.adminNotes = params.notes || 'Account suspended by fleet operations';
  }

  captain.updatedAt = now;
  persistCaptains();

  recordAuditLog({
    adminId: params.adminId,
    adminUsername: params.adminUsername,
    action: `CAPTAIN_${params.action.toUpperCase()}`,
    targetResource: 'captain_profile',
    targetId: captain.id,
    details: {
      name: captain.name,
      phone: captain.phone,
      notes: params.notes
    }
  });

  return { success: true, captain };
}

/**
 * Authenticates a Captain via Phone and PIN
 */
export function authenticateCaptainWithPin(phone: string, pin: string): {
  success: boolean;
  error?: string;
  captain?: CaptainOnboardingRecord;
} {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const hashedInput = crypto.createHash('sha256').update(pin.trim()).digest('hex');

  let found: CaptainOnboardingRecord | undefined;
  for (const c of captains.values()) {
    if (c.phone === cleanPhone || c.phone.replace(/[^\d]/g, '') === cleanPhone.replace(/[^\d]/g, '')) {
      found = c;
      break;
    }
  }

  if (!found) {
    return { success: false, error: 'No captain registered with this phone number.' };
  }

  // Check pin
  if (found.pinHash !== hashedInput && found.pinPlain !== pin.trim()) {
    return { success: false, error: 'Invalid security PIN.' };
  }

  if (found.approvalStatus !== 'approved') {
    return {
      success: false,
      error: `Captain account is currently ${found.approvalStatus.toUpperCase()}. Please wait for fleet administrator verification.`
    };
  }

  return { success: true, captain: found };
}

export function getAllCaptains(): CaptainOnboardingRecord[] {
  return Array.from(captains.values());
}

export function getCaptainById(id: string): CaptainOnboardingRecord | null {
  return captains.get(id) || null;
}

/**
 * Configure or update Captain's UPI Payout and Banking Details
 */
export function updateCaptainPaymentConfig(params: {
  captainId: string;
  upiId?: string;
  payoutAccountHolder?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  adminId?: string;
  adminUsername?: string;
}): { success: boolean; error?: string; captain?: CaptainOnboardingRecord } {
  const captain = captains.get(params.captainId);
  if (!captain) {
    return { success: false, error: 'Captain not found.' };
  }

  if (params.upiId !== undefined) {
    const cleanUpi = params.upiId.trim();
    if (cleanUpi && !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      return { success: false, error: 'Invalid UPI ID format (expected user@bank or phone@bank).' };
    }
    captain.upiId = cleanUpi;
  }

  if (params.payoutAccountHolder !== undefined) {
    captain.payoutAccountHolder = params.payoutAccountHolder.trim();
  }
  if (params.bankAccountNumber !== undefined) {
    captain.bankAccountNumber = params.bankAccountNumber.trim();
  }
  if (params.bankIfsc !== undefined) {
    captain.bankIfsc = params.bankIfsc.trim().toUpperCase();
  }

  captain.updatedAt = new Date().toISOString();
  persistCaptains();

  recordAuditLog({
    adminId: params.adminId || 'CAPTAIN_SELF',
    adminUsername: params.adminUsername || captain.name,
    action: 'CAPTAIN_PAYMENT_CONFIG_UPDATED',
    targetResource: 'captain_profile',
    targetId: captain.id,
    details: {
      upiId: captain.upiId,
      payoutAccountHolder: captain.payoutAccountHolder,
      bankIfsc: captain.bankIfsc
    }
  });

  return { success: true, captain };
}
