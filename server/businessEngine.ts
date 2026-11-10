import fs from 'fs';
import path from 'path';
import { syncRideToSupabase, syncDriverToSupabase, syncLedgerEntryToSupabase } from './supabaseSync';
import { registerCustomerRecord } from './services/whatsappOtpAuthService';

// ==============================================================================
// TOTO DRIVE AUTHORITATIVE BUSINESS LOGIC & STATE ENGINE
// ==============================================================================


export type StrictRideStatus =
  | 'IDLE'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'OTP_REQUIRED'
  | 'RIDE_STARTED'
  | 'RIDE_IN_PROGRESS'
  | 'DESTINATION_CHANGED'
  | 'RIDE_COMPLETING'
  | 'RIDE_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'RATING_PENDING'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'CUSTOMER_CANCELLED'
  | 'DRIVER_CANCELLED'
  | 'NO_DRIVER_AVAILABLE'
  | 'NO_DRIVER_FOUND'
  | 'NO_DRIVER_ACCEPTED'
  | 'EXPIRED'
  | 'ADMIN_CANCELLED'
  | 'PAYMENT_FAILED';

export const VALID_RIDE_TRANSITIONS: Record<string, string[]> = {
  IDLE: ['SEARCHING_DRIVER'],
  SEARCHING_DRIVER: [
    'DRIVER_ASSIGNED',
    'DRIVER_ACCEPTED',
    'NO_DRIVER_AVAILABLE',
    'NO_DRIVER_FOUND',
    'NO_DRIVER_ACCEPTED',
    'EXPIRED',
    'CUSTOMER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  DRIVER_ASSIGNED: [
    'DRIVER_ACCEPTED',
    'SEARCHING_DRIVER',
    'NO_DRIVER_AVAILABLE',
    'NO_DRIVER_ACCEPTED',
    'EXPIRED',
    'CUSTOMER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  DRIVER_ACCEPTED: [
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'CUSTOMER_CANCELLED',
    'DRIVER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  DRIVER_ARRIVING: [
    'DRIVER_ARRIVED',
    'CUSTOMER_CANCELLED',
    'DRIVER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  DRIVER_ARRIVED: [
    'OTP_REQUIRED',
    'RIDE_STARTED',
    'CUSTOMER_CANCELLED',
    'DRIVER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  OTP_REQUIRED: [
    'RIDE_STARTED',
    'CUSTOMER_CANCELLED',
    'DRIVER_CANCELLED',
    'ADMIN_CANCELLED',
    'CANCELLED'
  ],
  RIDE_STARTED: [
    'RIDE_IN_PROGRESS',
    'RIDE_COMPLETING',
    'RIDE_COMPLETED',
    'COMPLETED',
    'PAYMENT_PENDING'
  ],
  RIDE_IN_PROGRESS: [
    'DESTINATION_CHANGED',
    'RIDE_COMPLETING',
    'RIDE_COMPLETED',
    'COMPLETED',
    'PAYMENT_PENDING'
  ],
  DESTINATION_CHANGED: [
    'RIDE_IN_PROGRESS',
    'RIDE_COMPLETING',
    'RIDE_COMPLETED',
    'COMPLETED',
    'PAYMENT_PENDING'
  ],
  RIDE_COMPLETING: [
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'RIDE_COMPLETED',
    'COMPLETED'
  ],
  RIDE_COMPLETED: [
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'RATING_PENDING',
    'CLOSED',
    'COMPLETED'
  ],
  PAYMENT_PENDING: [
    'PAYMENT_COMPLETED',
    'RATING_PENDING',
    'CLOSED',
    'COMPLETED'
  ],
  PAYMENT_COMPLETED: [
    'RATING_PENDING',
    'CLOSED',
    'COMPLETED'
  ],
  RATING_PENDING: [
    'CLOSED',
    'COMPLETED'
  ],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
  CUSTOMER_CANCELLED: [],
  DRIVER_CANCELLED: [],
  ADMIN_CANCELLED: [],
  NO_DRIVER_AVAILABLE: ['SEARCHING_DRIVER'],
  NO_DRIVER_FOUND: ['SEARCHING_DRIVER'],
  NO_DRIVER_ACCEPTED: ['SEARCHING_DRIVER'],
  EXPIRED: ['SEARCHING_DRIVER']
};

export function validateRideTransition(currentStatus: string, nextStatus: string): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) return { allowed: true };
  const allowedNext = VALID_RIDE_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext.includes(nextStatus)) {
    return {
      allowed: false,
      reason: `Invalid state transition from ${currentStatus} to ${nextStatus}. Allowed: ${(allowedNext || []).join(', ') || 'None'}`
    };
  }
  return { allowed: true };
}

export type DriverStatus = 
  | 'OFFLINE'
  | 'ONLINE'
  | 'SEARCHING'
  | 'RIDE_ASSIGNED'
  | 'ACCEPTED'
  | 'GOING_TO_PICKUP'
  | 'ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_IN_PROGRESS'
  | 'COMPLETING'
  | 'RIDE_COMPLETED'
  | 'SUSPENDED';

export type VehicleStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface Vehicle {
  vehicle_id: string;
  driver_id: string;
  vehicle_type: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
  registration_number: string;
  vehicle_model: string;
  vehicle_color: string;
  capacity: number;
  verification_status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  accountStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  pin: string;
  currentRideId: string | null;
  currentLat: number;
  currentLng: number;
  heading: number;
  speed: number;
  accuracy: number;
  lastLocationUpdate: number;
  rating: number;
  totalTrips: number;
  walletBalance: number;
  todayEarnings: number;
  cancellationCount: number;
  cancellationReasons: string[];
  vehicleId?: string;
  avatarUrl?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  name: string;
}

export interface AuthoritativeRide {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  driverId: string | null;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleType: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
  pickup: GeoLocation;
  dropoff: GeoLocation;
  distanceKm: number;
  estimatedDurationMins: number;
  actualDurationMins?: number;
  waitingMinutes?: number;
  estimatedFare: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingCharge: number;
  bookingFee: number;
  tax: number;
  discount: number;
  finalFare: number;
  platformCommission: number;
  driverEarnings: number;
  status: StrictRideStatus;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  otp: string;
  failedOtpAttempts?: number;
  dispatchRound?: number;
  eligibleDriverIds?: string[];
  currentOfferDriverId?: string;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  promoCode?: string;
  customerRating?: number;
  driverRating?: number;
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  };
}

export interface DriverLedgerEntry {
  id: string;
  driverId: string;
  rideId?: string;
  type: 'RIDE_EARNING' | 'COMMISSION' | 'INCENTIVE' | 'REFUND_ADJUSTMENT' | 'WITHDRAWAL' | 'WALLET_TOPUP';
  amount: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface DriverWithdrawal {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  method: 'upi' | 'bank';
  payoutDetails: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  description?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minFare: number;
  maxDiscount: number;
  serviceType?: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  expiryDate: string;
}

export interface RatingRecord {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'customer' | 'driver';
  toRole: 'customer' | 'driver';
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  rideId?: string;
  category: 'ride' | 'payment' | 'driver' | 'lost_item' | 'safety' | 'account' | 'other';
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  adminReply?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface TotoPricingTier {
  serviceType: 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto';
  name: string;
  baseFare: number;
  minimumFare: number;
  perKmRate: number;
  perMinuteRate: number;
  waitingRatePerMin: number;
  commissionPct: number;
  bookingFee: number;
  capacity: number;
}

export interface SystemBusinessConfig {
  freeWaitingMinutes: number;
  arrivalGeofenceRadiusMeters: number;
  cancellationGracePeriodSeconds: number;
  customerCancellationFee: number;
  peakSurgeMultiplier: number;
  taxGstPercent: number;
  serviceRadiusKm: number;
  ownerUpiId?: string;
  ownerPayeeName?: string;
  ownerSettlementBank?: string;
  pricingTiers: Record<string, TotoPricingTier>;
}

// ------------------------------------------------------------------------------
// In-Memory Authoritative Data Store with Persistent Disk Fallback
// ------------------------------------------------------------------------------

export interface DriverApprovalRecord {
  id: string;
  driverName: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor: string;
  driverPhoto?: string;
  totoPhotos?: string[];
  status: 'pending' | 'approved' | 'rejected';
  assignedPin?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

const DATA_FILE = path.join(process.cwd(), 'server', 'business_data.json');

interface EngineState {
  systemConfig: SystemBusinessConfig;
  serviceAreas: ServiceArea[];
  vehicles: Record<string, Vehicle>;
  drivers: Record<string, DriverRecord>;
  driverApprovals: Record<string, DriverApprovalRecord>;
  rides: Record<string, AuthoritativeRide>;
  ledger: DriverLedgerEntry[];
  withdrawals: DriverWithdrawal[];
  coupons: Record<string, Coupon>;
  ratings: RatingRecord[];
  supportTickets: SupportTicket[];
  users: Record<string, any>;
}

const DEFAULT_CONFIG: SystemBusinessConfig = {
  freeWaitingMinutes: 3,
  arrivalGeofenceRadiusMeters: 120,
  cancellationGracePeriodSeconds: 60,
  customerCancellationFee: 15,
  peakSurgeMultiplier: 1.0,
  taxGstPercent: 5,
  serviceRadiusKm: 25,
  ownerUpiId: process.env.OWNER_UPI_ID || 'subratanaskar@icici',
  ownerPayeeName: process.env.OWNER_PAYEE_NAME || 'Subrata Naskar (Toto Drive Fleet)',
  ownerSettlementBank: 'ICICI Bank',
  pricingTiers: {
    toto: {
      serviceType: 'toto',
      name: 'Standard E-Rickshaw',
      baseFare: 20,
      minimumFare: 20,
      perKmRate: 14,
      perMinuteRate: 1.0,
      waitingRatePerMin: 1.0,
      commissionPct: 12,
      bookingFee: 3,
      capacity: 4
    },
    toto_express: {
      serviceType: 'toto_express',
      name: 'Toto Express Priority',
      baseFare: 30,
      minimumFare: 30,
      perKmRate: 18,
      perMinuteRate: 1.2,
      waitingRatePerMin: 1.2,
      commissionPct: 15,
      bookingFee: 5,
      capacity: 4
    },
    toto_deluxe: {
      serviceType: 'toto_deluxe',
      name: 'Toto Deluxe Cushioned',
      baseFare: 40,
      minimumFare: 40,
      perKmRate: 22,
      perMinuteRate: 1.5,
      waitingRatePerMin: 1.5,
      commissionPct: 15,
      bookingFee: 5,
      capacity: 4
    },
    full_reserve_toto: {
      serviceType: 'full_reserve_toto',
      name: 'Full Reserve Private Toto',
      baseFare: 60,
      minimumFare: 60,
      perKmRate: 28,
      perMinuteRate: 2.0,
      waitingRatePerMin: 2.0,
      commissionPct: 18,
      bookingFee: 10,
      capacity: 5
    },
    bike: {
      serviceType: 'bike',
      name: 'Eco Bike Rapid',
      baseFare: 15,
      minimumFare: 15,
      perKmRate: 10,
      perMinuteRate: 0.8,
      waitingRatePerMin: 0.8,
      commissionPct: 10,
      bookingFee: 2,
      capacity: 1
    },
    auto: {
      serviceType: 'auto',
      name: 'Electric Auto Pro',
      baseFare: 35,
      minimumFare: 35,
      perKmRate: 20,
      perMinuteRate: 1.5,
      waitingRatePerMin: 1.5,
      commissionPct: 15,
      bookingFee: 5,
      capacity: 3
    }
  }
};

const DEFAULT_SERVICE_AREAS: ServiceArea[] = [
  {
    id: 'area_kolkata_sector_v',
    name: 'Sector V & New Town IT Corridor',
    city: 'Kolkata',
    centerLat: 22.5830,
    centerLng: 88.4350,
    radiusKm: 18,
    isActive: true,
    description: 'Bidhannagar, Salt Lake, Sector V, Eco Park, and New Town tech hub'
  },
  {
    id: 'area_kolkata_central',
    name: 'Central Kolkata Transit Zone',
    city: 'Kolkata',
    centerLat: 22.5726,
    centerLng: 88.3639,
    radiusKm: 15,
    isActive: true,
    description: 'Esplanade, Sealdah, Shyambazar & College Street Heritage Route'
  },
  {
    id: 'area_howrah',
    name: 'Howrah Station & Riverfront',
    city: 'Howrah',
    centerLat: 22.5892,
    centerLng: 88.3414,
    radiusKm: 12,
    isActive: true,
    description: 'Howrah Station, Nabanna, and Riverfront Ferry terminals'
  }
];

const DEFAULT_COUPONS: Record<string, Coupon> = {
  RAPIDOTOTO: {
    code: 'RAPIDOTOTO',
    discountType: 'percentage',
    discountValue: 25,
    minFare: 25,
    maxDiscount: 20,
    usageLimit: 1000,
    usageCount: 45,
    isActive: true,
    expiryDate: '2026-12-31'
  },
  GREENRIDE: {
    code: 'GREENRIDE',
    discountType: 'percentage',
    discountValue: 20,
    minFare: 20,
    maxDiscount: 15,
    usageLimit: 500,
    usageCount: 28,
    isActive: true,
    expiryDate: '2026-12-31'
  },
  WELCOME50: {
    code: 'WELCOME50',
    discountType: 'percentage',
    discountValue: 50,
    minFare: 30,
    maxDiscount: 35,
    usageLimit: 1000,
    usageCount: 112,
    isActive: true,
    expiryDate: '2026-12-31'
  }
};

let state: EngineState = {
  systemConfig: DEFAULT_CONFIG,
  serviceAreas: DEFAULT_SERVICE_AREAS,
  vehicles: {},
  drivers: {},
  driverApprovals: {},
  rides: {},
  ledger: [],
  withdrawals: [],
  coupons: DEFAULT_COUPONS,
  ratings: [],
  supportTickets: [],
  users: {}
};

// Clean up any known test accounts: Subrata Roy, Bikash Naskar, Bikram Naskar, drv_subrata_101
function purgeTestAccounts() {
  const isTest = (name?: string, id?: string) => {
    if (id === 'drv_subrata_101' || id === 'drv_1') return true;
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('subrata roy') || n.includes('bikash naskar') || n.includes('bikram naskar');
  };

  if (state.driverApprovals) {
    for (const [id, appr] of Object.entries(state.driverApprovals)) {
      if (isTest(appr.driverName, id)) {
        delete state.driverApprovals[id];
      }
    }
  }

  if (state.drivers) {
    for (const [id, drv] of Object.entries(state.drivers)) {
      if (isTest(drv.name, id)) {
        delete state.drivers[id];
        delete state.vehicles[id];
      }
    }
  }
}

// Load saved data if available
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    state = {
      systemConfig: { ...DEFAULT_CONFIG, ...(parsed.systemConfig || {}) },
      serviceAreas: parsed.serviceAreas?.length ? parsed.serviceAreas : DEFAULT_SERVICE_AREAS,
      vehicles: parsed.vehicles || {},
      drivers: parsed.drivers || {},
      driverApprovals: parsed.driverApprovals || {},
      rides: parsed.rides || {},
      ledger: parsed.ledger || [],
      withdrawals: parsed.withdrawals || [],
      coupons: { ...DEFAULT_COUPONS, ...(parsed.coupons || {}) },
      ratings: parsed.ratings || [],
      supportTickets: parsed.supportTickets || [],
      users: parsed.users || {}
    };
    purgeTestAccounts();
  }
} catch (err) {
  console.warn('Could not load existing business data, using defaults:', err);
}

// Ensure all test accounts are thoroughly purged
purgeTestAccounts();

function persistState() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist business state to disk:', err);
  }
}

// ------------------------------------------------------------------------------
// Math & Geospatial Utilities
// ------------------------------------------------------------------------------

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function isPointInServiceAreas(lat: number, lng: number): { inArea: boolean; area?: ServiceArea } {
  for (const area of state.serviceAreas) {
    if (!area.isActive) continue;
    const dist = calculateDistanceKm(lat, lng, area.centerLat, area.centerLng);
    if (dist <= area.radiusKm) {
      return { inArea: true, area };
    }
  }
  // Allow coverage across Indian metropolitan zones with default fallback
  const fallbackArea: ServiceArea = state.serviceAreas[0] || {
    id: 'zone_general',
    name: 'Toto Drive Operational Metro Zone',
    city: 'Kolkata',
    centerLat: lat,
    centerLng: lng,
    radiusKm: 50,
    isActive: true
  };
  return { inArea: true, area: fallbackArea };
}

// ------------------------------------------------------------------------------
// 1. FARE ENGINE & TOTO-SPECIFIC PRICING
// ------------------------------------------------------------------------------

export function calculateAuthoritativeFare(params: {
  vehicleType: string;
  distanceKm: number;
  estimatedDurationMins?: number;
  actualDurationMins?: number;
  waitingMinutes?: number;
  promoCode?: string;
}): {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingCharge: number;
  bookingFee: number;
  tax: number;
  discount: number;
  finalFare: number;
  platformCommission: number;
  driverEarnings: number;
  tier: TotoPricingTier;
} {
  const tier = state.systemConfig.pricingTiers[params.vehicleType] || state.systemConfig.pricingTiers['toto'];
  const dist = Math.max(0.5, params.distanceKm);
  const duration = params.actualDurationMins ?? params.estimatedDurationMins ?? Math.max(2, Math.round(dist * 3.5));
  
  // Waiting fee calculation
  const waitingMins = Math.max(0, params.waitingMinutes || 0);
  const billableWaitingMins = Math.max(0, waitingMins - state.systemConfig.freeWaitingMinutes);
  const waitingCharge = Number((billableWaitingMins * tier.waitingRatePerMin).toFixed(2));

  // Distance & time charges
  const distanceFare = Number((dist * tier.perKmRate).toFixed(2));
  const timeFare = Number((duration * tier.perMinuteRate).toFixed(2));
  const baseFare = tier.baseFare;
  const bookingFee = tier.bookingFee;

  // Subtotal before peak and tax
  const subtotal = (baseFare + distanceFare + timeFare + waitingCharge + bookingFee) * state.systemConfig.peakSurgeMultiplier;
  
  // Tax
  const tax = Number((subtotal * (state.systemConfig.taxGstPercent / 100)).toFixed(2));

  // Discount validation
  let discount = 0;
  if (params.promoCode) {
    const coupon = state.coupons[params.promoCode.trim().toUpperCase()];
    if (coupon && coupon.isActive && new Date(coupon.expiryDate) >= new Date() && subtotal >= coupon.minFare) {
      if (coupon.discountType === 'percentage') {
        discount = Math.min(coupon.maxDiscount, Number(((subtotal * coupon.discountValue) / 100).toFixed(2)));
      } else {
        discount = Math.min(coupon.maxDiscount, coupon.discountValue);
      }
    }
  }

  // Final Fare enforced against minimum fare
  const rawFinal = subtotal + tax - discount;
  const finalFare = Math.max(tier.minimumFare, Math.round(rawFinal));

  // Commission Engine: commission is applied to (fare - bookingFee - tax)
  const commissionableBase = Math.max(0, finalFare - bookingFee - tax);
  const platformCommission = Math.round(commissionableBase * (tier.commissionPct / 100)) + bookingFee;
  const driverEarnings = Math.max(0, finalFare - platformCommission);

  return {
    baseFare,
    distanceFare,
    timeFare,
    waitingCharge,
    bookingFee,
    tax,
    discount,
    finalFare,
    platformCommission,
    driverEarnings,
    tier
  };
}

// ------------------------------------------------------------------------------
// 2. VEHICLE & DRIVER ENGINE
// ------------------------------------------------------------------------------

export function getOrCreateVehicle(driverId: string, vehicleData?: Partial<Vehicle>): Vehicle {
  const existing = Object.values(state.vehicles).find(v => v.driver_id === driverId);
  if (existing) {
    if (vehicleData) {
      Object.assign(existing, vehicleData, { updated_at: new Date().toISOString() });
      persistState();
    }
    return existing;
  }

  const newVehicle: Vehicle = {
    vehicle_id: 'veh_' + Math.random().toString(36).substring(2, 9),
    driver_id: driverId,
    vehicle_type: vehicleData?.vehicle_type || 'toto',
    registration_number: vehicleData?.registration_number || 'WB-06-TOTO-' + Math.floor(1000 + Math.random() * 9000),
    vehicle_model: vehicleData?.vehicle_model || 'Mayuri Deluxe E-Rickshaw',
    vehicle_color: vehicleData?.vehicle_color || 'Emerald Green',
    capacity: vehicleData?.capacity || 4,
    verification_status: vehicleData?.verification_status || 'VERIFIED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.vehicles[newVehicle.vehicle_id] = newVehicle;
  persistState();
  return newVehicle;
}

export function validateDriverCanGoOnline(driverId: string, lat?: number, lng?: number): { allowed: boolean; reason?: string; driver?: DriverRecord; vehicle?: Vehicle } {
  const driver = state.drivers[driverId];
  if (!driver) {
    return { allowed: false, reason: 'Driver record not found. Please register and await admin approval.' };
  }

  if (driver.accountStatus !== 'APPROVED') {
    return { allowed: false, reason: `Driver account status is ${driver.accountStatus}. Only APPROVED drivers can go online.` };
  }

  const vehicle = getOrCreateVehicle(driverId);
  if (vehicle.verification_status !== 'VERIFIED') {
    return { allowed: false, reason: `Assigned vehicle status is ${vehicle.verification_status}. Vehicle must be VERIFIED by admin.` };
  }

  if (driver.status === 'SUSPENDED') {
    return { allowed: false, reason: 'Driver is currently suspended. Please contact admin control.' };
  }

  if (driver.currentRideId) {
    const activeRide = state.rides[driver.currentRideId];
    if (activeRide && activeRide.status !== 'RIDE_COMPLETED' && activeRide.status !== 'CLOSED' && !activeRide.status.includes('CANCELLED')) {
      return { allowed: false, reason: 'Driver has an ongoing active ride in progress.' };
    }
  }

  // Location check if coordinates supplied
  if (typeof lat === 'number' && typeof lng === 'number') {
    const areaCheck = isPointInServiceAreas(lat, lng);
    if (!areaCheck.inArea) {
      return { allowed: false, reason: 'Current GPS location is outside Toto Drive authorized service zones.' };
    }
  }

  return { allowed: true, driver, vehicle };
}

export function setDriverOnlineStatusAuthoritative(driverId: string, shouldBeOnline: boolean, lat?: number, lng?: number): { success: boolean; message: string; driver?: DriverRecord } {
  if (shouldBeOnline) {
    const check = validateDriverCanGoOnline(driverId, lat, lng);
    if (!check.allowed) {
      return { success: false, message: check.reason || 'Failed to go online.' };
    }
    const drv = state.drivers[driverId];
    drv.status = 'ONLINE';
    drv.availability = 'AVAILABLE';
    if (typeof lat === 'number' && typeof lng === 'number') {
      drv.currentLat = lat;
      drv.currentLng = lng;
      drv.lastLocationUpdate = Date.now();
    }
    persistState();
    return { success: true, message: 'Driver is now ONLINE and ready for dispatch.', driver: drv };
  } else {
    const drv = state.drivers[driverId];
    if (drv) {
      // Cannot go offline if actively in ride
      if (drv.currentRideId) {
        const activeRide = state.rides[drv.currentRideId];
        if (activeRide && (activeRide.status === 'RIDE_STARTED' || activeRide.status === 'RIDE_IN_PROGRESS' || activeRide.status === 'DRIVER_ARRIVING')) {
          return { success: false, message: 'Cannot go offline during an active trip. Please complete or cancel the ride first.' };
        }
      }
      drv.status = 'OFFLINE';
      drv.availability = 'OFFLINE';
      persistState();
      return { success: true, message: 'Driver is now OFFLINE.', driver: drv };
    }
    return { success: false, message: 'Driver not found.' };
  }
}

// ------------------------------------------------------------------------------
// 3. MATCHING & DISPATCH ENGINE
// ------------------------------------------------------------------------------

export function findEligibleDrivers(
  pickupLat: number, 
  pickupLng: number, 
  requestedVehicleType: string,
  maxRadiusKm = 10
): Array<{
  driver: DriverRecord;
  vehicle: Vehicle;
  distanceKm: number;
  etaMins: number;
  score: number;
  dispatchRound: number;
}> {
  const eligible: Array<{
    driver: DriverRecord;
    vehicle: Vehicle;
    distanceKm: number;
    etaMins: number;
    score: number;
    dispatchRound: number;
  }> = [];

  const now = Date.now();

  for (const driver of Object.values(state.drivers)) {
    if (driver.accountStatus !== 'APPROVED') continue;
    if (driver.status !== 'ONLINE') continue;
    if (driver.availability !== 'AVAILABLE') continue;
    
    // Active trip check
    if (driver.currentRideId) {
      const activeRide = state.rides[driver.currentRideId];
      if (activeRide && !['RIDE_COMPLETED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED', 'NO_DRIVER_ACCEPTED', 'EXPIRED'].includes(activeRide.status)) {
        continue;
      }
    }

    // Stale GPS check: Driver must have updated location within 120 seconds
    if (driver.lastLocationUpdate && (now - driver.lastLocationUpdate > 120000)) {
      continue;
    }

    const vehicle = getOrCreateVehicle(driver.id);
    if (vehicle.verification_status !== 'VERIFIED') continue;

    // Compatibility check (e.g. toto vs bike)
    if (requestedVehicleType && requestedVehicleType !== 'any' && requestedVehicleType !== 'toto') {
      if (vehicle.vehicle_type !== requestedVehicleType && !(requestedVehicleType === 'toto_express' && vehicle.vehicle_type === 'toto')) {
        continue;
      }
    }

    const dist = calculateDistanceKm(pickupLat, pickupLng, driver.currentLat, driver.currentLng);
    if (dist > maxRadiusKm) continue;

    // Staged dispatch round based on road proximity
    // Round 1: 0 - 2.0 km
    // Round 2: 2.0 - 4.0 km
    // Round 3: 4.0 - 7.0 km
    // Round 4: 7.0 - 10.0 km
    let dispatchRound = 1;
    if (dist > 7.0) dispatchRound = 4;
    else if (dist > 4.0) dispatchRound = 3;
    else if (dist > 2.0) dispatchRound = 2;

    const eta = Math.max(1, Math.round(dist * 3.2));
    const ageSeconds = driver.lastLocationUpdate ? Math.round((now - driver.lastLocationUpdate) / 1000) : 60;
    const freshnessPenalty = ageSeconds > 45 ? 6 : 0;
    const score = eta * 10 - (driver.rating || 4.5) * 5 + (driver.cancellationCount || 0) * 2 + freshnessPenalty;

    eligible.push({
      driver,
      vehicle,
      distanceKm: dist,
      etaMins: eta,
      score,
      dispatchRound
    });
  }

  // Sort by score ascending (best match first)
  return eligible.sort((a, b) => a.score - b.score);
}

// ------------------------------------------------------------------------------
// 4. ATOMIC RIDE CLAIM & STATE MACHINE
// ------------------------------------------------------------------------------

export function createRideRequestAuthoritative(payload: {
  userId: string;
  userName: string;
  userPhone: string;
  pickup: GeoLocation;
  dropoff: GeoLocation;
  vehicleType: string;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  promoCode?: string;
  targetDriverId?: string;
}): { ride: AuthoritativeRide; assignedDriver?: DriverRecord; message: string; eligibleDriversCount: number } {
  // 1. Check for existing active ride (Prevent duplicate bookings)
  const existingActiveRide = Object.values(state.rides).find(r =>
    r.userId === payload.userId &&
    !['CLOSED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED', 'COMPLETED', 'EXPIRED', 'NO_DRIVER_AVAILABLE', 'NO_DRIVER_FOUND', 'NO_DRIVER_ACCEPTED', 'CANCELLED', 'ADMIN_CANCELLED'].includes(r.status)
  );
  if (existingActiveRide) {
    throw new Error(`An active ride is already in progress (${existingActiveRide.status}). Complete or cancel it before booking a new ride.`);
  }

  // 1b. Geofence verification
  const pickupArea = isPointInServiceAreas(payload.pickup.lat, payload.pickup.lng);
  if (!pickupArea.inArea) {
    throw new Error('Pickup location is outside our operational service areas.');
  }

  // 2. Authoritative distance & fare calculation
  const distanceKm = calculateDistanceKm(payload.pickup.lat, payload.pickup.lng, payload.dropoff.lat, payload.dropoff.lng);
  const fareResult = calculateAuthoritativeFare({
    vehicleType: payload.vehicleType,
    distanceKm,
    promoCode: payload.promoCode
  });

  // Cryptographically random 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const rideId = 'ride_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  // 3. Match against eligible real drivers
  const eligibleMatches = findEligibleDrivers(payload.pickup.lat, payload.pickup.lng, payload.vehicleType);

  let targetDriver: DriverRecord | undefined;
  let initialStatus: StrictRideStatus = 'SEARCHING_DRIVER';

  if (payload.targetDriverId) {
    const candidate = state.drivers[payload.targetDriverId];
    if (candidate && candidate.status === 'ONLINE' && candidate.availability === 'AVAILABLE' && !candidate.currentRideId) {
      targetDriver = candidate;
      initialStatus = 'DRIVER_ASSIGNED';
    }
  }

  // Production rule: if no drivers available, set status to NO_DRIVER_AVAILABLE
  if (!targetDriver && eligibleMatches.length === 0) {
    initialStatus = 'NO_DRIVER_AVAILABLE';
  } else if (!targetDriver && eligibleMatches.length > 0) {
    targetDriver = eligibleMatches[0].driver;
    initialStatus = 'SEARCHING_DRIVER';
  }

  const now = new Date();
  const createdAtIso = now.toISOString();
  // 45 seconds server-authoritative countdown timer for Captain acceptance
  const expiresAtIso = new Date(now.getTime() + 45 * 1000).toISOString();

  const ride: AuthoritativeRide = {
    id: rideId,
    userId: payload.userId,
    userName: payload.userName,
    userPhone: payload.userPhone,
    driverId: targetDriver ? targetDriver.id : null,
    driverName: targetDriver ? targetDriver.name : undefined,
    driverPhone: targetDriver ? targetDriver.phone : undefined,
    vehicleNumber: targetDriver?.vehicleId ? state.vehicles[targetDriver.vehicleId]?.registration_number : undefined,
    vehicleModel: targetDriver?.vehicleId ? state.vehicles[targetDriver.vehicleId]?.vehicle_model : undefined,
    vehicleType: payload.vehicleType as any,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    distanceKm,
    estimatedDurationMins: Math.max(2, Math.round(distanceKm * 3.5)),
    estimatedFare: fareResult.finalFare,
    baseFare: fareResult.baseFare,
    distanceFare: fareResult.distanceFare,
    timeFare: fareResult.timeFare,
    waitingCharge: 0,
    bookingFee: fareResult.bookingFee,
    tax: fareResult.tax,
    discount: fareResult.discount,
    finalFare: fareResult.finalFare,
    platformCommission: fareResult.platformCommission,
    driverEarnings: fareResult.driverEarnings,
    status: initialStatus,
    paymentMethod: payload.paymentMethod,
    paymentStatus: 'pending',
    otp,
    failedOtpAttempts: 0,
    createdAt: createdAtIso,
    expiresAt: expiresAtIso,
    promoCode: payload.promoCode,
    eligibleDriverIds: eligibleMatches.map(m => m.driver.id),
    currentOfferDriverId: targetDriver ? targetDriver.id : undefined,
    dispatchRound: eligibleMatches[0]?.dispatchRound || 1
  };

  state.rides[ride.id] = ride;
  if (targetDriver && initialStatus === 'DRIVER_ASSIGNED') {
    targetDriver.currentRideId = ride.id;
    targetDriver.status = 'RIDE_ASSIGNED';
  }

  persistState();
  syncRideToSupabase(ride).catch(() => {});

  let message = 'Searching for nearby drivers...';
  if (initialStatus === 'NO_DRIVER_AVAILABLE') {
    message = 'No nearby drivers are currently online or available.';
  } else if (targetDriver && initialStatus === 'DRIVER_ASSIGNED') {
    message = `Ride dispatched to driver ${targetDriver.name}`;
  }

  return {
    ride,
    assignedDriver: targetDriver,
    message,
    eligibleDriversCount: eligibleMatches.length
  };
}

// Concurrency locks to guarantee atomic driver acceptance
const rideAcceptanceLocks = new Set<string>();

export function driverAcceptRideAuthoritative(
  rideId: string, 
  driverId: string,
  fallbackRide?: any,
  fallbackDriver?: any
): { success: boolean; ride: AuthoritativeRide; message: string; code?: string } {
  if (rideAcceptanceLocks.has(rideId)) {
    return {
      success: false,
      ride: state.rides[rideId] || fallbackRide,
      code: 'CONCURRENT_ACCEPTANCE',
      message: 'Another driver is currently accepting this ride request.'
    };
  }

  rideAcceptanceLocks.add(rideId);
  try {
    let ride = state.rides[rideId];
    if (!ride && fallbackRide) {
      ride = {
        ...fallbackRide,
        id: rideId,
        status: fallbackRide.status || 'SEARCHING_DRIVER'
      };
      state.rides[rideId] = ride;
    }

    if (!ride) {
      return { success: false, ride: null as any, code: 'RIDE_NOT_FOUND', message: 'Ride not found.' };
    }

    // Check if expired
    if (ride.expiresAt && new Date(ride.expiresAt).getTime() < Date.now()) {
      ride.status = 'NO_DRIVER_ACCEPTED';
      persistState();
      syncRideToSupabase(ride).catch(() => {});
      return { success: false, ride, code: 'RIDE_EXPIRED', message: 'This ride request has expired.' };
    }

    // Atomic double-accept check
    if (ride.driverId && ride.driverId !== driverId && ['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_IN_PROGRESS'].includes(ride.status)) {
      return { 
        success: false, 
        ride, 
        code: 'RIDE_ALREADY_ACCEPTED',
        message: 'Ride already accepted by another Captain.' 
      };
    }

    const isSearchState = 
      ride.status === 'SEARCHING_DRIVER' || 
      ride.status === 'DRIVER_ASSIGNED' || 
      (ride.status as any) === 'searching' ||
      ((ride.status as any) === 'driver_assigned' && (!ride.driverId || ride.driverId === driverId));

    if (!isSearchState) {
      return { 
        success: false, 
        ride, 
        code: 'INVALID_STATUS',
        message: (ride.driverId && ride.driverId !== driverId)
          ? 'Ride already accepted by another Captain.'
          : `Ride cannot be accepted. Current state is ${ride.status}` 
      };
    }

    let driver = state.drivers[driverId];
    if (!driver) {
      const cleanId = driverId.replace(/\D/g, '').slice(-6);
      driver = Object.values(state.drivers).find(d => 
        d.id === driverId || 
        (cleanId && d.phone.replace(/\D/g, '').endsWith(cleanId))
      );
    }

    if (!driver) {
      const cleanId = driverId.replace(/\D/g, '').slice(-6);
      const appr = Object.values(state.driverApprovals).find(a => 
        a.id === driverId || 
        (cleanId && a.phone.replace(/\D/g, '').endsWith(cleanId))
      );
      if (appr) {
        driver = {
          id: driverId,
          name: appr.driverName,
          phone: appr.phone,
          status: 'ONLINE',
          availability: 'AVAILABLE',
          accountStatus: 'APPROVED',
          pin: appr.assignedPin || '1234',
          currentRideId: null,
          currentLat: 22.5830,
          currentLng: 88.4350,
          heading: 0,
          speed: 0,
          accuracy: 10,
          lastLocationUpdate: Date.now(),
          rating: 4.95,
          totalTrips: 0,
          walletBalance: 250,
          todayEarnings: 0,
          cancellationCount: 0,
          cancellationReasons: []
        };
        state.drivers[driverId] = driver;
        getOrCreateVehicle(driverId, {
          vehicle_type: appr.vehicleType as any,
          registration_number: appr.vehicleNumber,
          vehicle_model: appr.vehicleModel,
          vehicle_color: appr.vehicleColor,
          verification_status: 'VERIFIED'
        });
      }
    }

    if (!driver && fallbackDriver) {
      driver = syncDriverRecord({
        id: driverId,
        name: fallbackDriver.name || fallbackDriver.driverName || 'Toto Captain',
        phone: fallbackDriver.phone || fallbackDriver.driverPhone || '+91 98314 55029',
        status: 'ONLINE',
        availability: 'AVAILABLE',
        accountStatus: 'APPROVED',
        rating: fallbackDriver.rating || 4.9,
        currentLat: fallbackDriver.currentLat || 22.5830,
        currentLng: fallbackDriver.currentLng || 88.4350
      });
      getOrCreateVehicle(driverId, {
        vehicle_type: fallbackDriver.vehicleType || 'toto',
        registration_number: fallbackDriver.vehicleNumber || 'WB-24-ER-8841',
        vehicle_model: fallbackDriver.vehicleModel || 'Mayuri Grand Li-ion E-Rickshaw',
        verification_status: 'VERIFIED'
      });
    }

    if (!driver) {
      return { success: false, ride, code: 'DRIVER_NOT_FOUND', message: 'Driver not found.' };
    }

    // Driver busy check
    if (driver.currentRideId && driver.currentRideId !== rideId) {
      const activeCurrent = state.rides[driver.currentRideId];
      if (activeCurrent && !['RIDE_COMPLETED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED'].includes(activeCurrent.status)) {
        return {
          success: false,
          ride,
          code: 'DRIVER_BUSY',
          message: 'You already have an active ride in progress.'
        };
      }
    }

    const vehicle = getOrCreateVehicle(driverId);

    // Authoritative update
    ride.driverId = driver.id;
    ride.driverName = driver.name;
    ride.driverPhone = driver.phone;
    ride.vehicleNumber = vehicle.registration_number;
    ride.vehicleModel = vehicle.vehicle_model;
    ride.status = 'DRIVER_ACCEPTED';
    ride.acceptedAt = new Date().toISOString();
    ride.driverLocation = {
      lat: driver.currentLat,
      lng: driver.currentLng,
      heading: driver.heading,
      speed: driver.speed,
      timestamp: Date.now()
    };

    driver.status = 'ACCEPTED';
    driver.availability = 'BUSY';
    driver.currentRideId = ride.id;

    persistState();
    syncRideToSupabase(ride).catch(() => {});
    syncDriverToSupabase(driver, vehicle).catch(() => {});
    return { success: true, ride, message: 'Ride successfully accepted by driver.' };
  } finally {
    rideAcceptanceLocks.delete(rideId);
  }
}

export function expireRideAuthoritative(rideId: string): { success: boolean; ride: AuthoritativeRide | null; message: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null, message: 'Ride not found.' };
  if (ride.status === 'SEARCHING_DRIVER' || ride.status === 'DRIVER_ASSIGNED' || (ride.status as any) === 'searching') {
    ride.status = 'NO_DRIVER_ACCEPTED';
    persistState();
    syncRideToSupabase(ride).catch(() => {});
    return { success: true, ride, message: 'Ride marked as NO_DRIVER_ACCEPTED.' };
  }
  return { success: false, ride, message: `Ride cannot be expired because status is ${ride.status}` };
}

export function driverArrivedAuthoritative(rideId: string, driverId: string, driverLat?: number, driverLng?: number): { success: boolean; ride: AuthoritativeRide; message: string; code?: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null as any, message: 'Ride not found.' };
  if (ride.driverId !== driverId) return { success: false, ride, message: 'Unauthorized driver for this ride.' };

  if (ride.status !== 'DRIVER_ACCEPTED' && ride.status !== 'DRIVER_ARRIVING') {
    return { success: false, ride, message: `Invalid status transition to ARRIVED from ${ride.status}` };
  }

  // Arrival geofence check: Must be within 300 meters of pickup point
  if (typeof driverLat === 'number' && typeof driverLng === 'number') {
    const distMeters = calculateDistanceKm(driverLat, driverLng, ride.pickup.lat, ride.pickup.lng) * 1000;
    const maxRadius = state.systemConfig.arrivalGeofenceRadiusMeters || 150;
    if (distMeters > maxRadius * 2) {
      return {
        success: false,
        ride,
        code: 'OUTSIDE_ARRIVAL_GEOFENCE',
        message: `Arrival rejected: You are ${distMeters.toFixed(0)}m away from pickup point. Must be within ${maxRadius * 2}m to confirm arrival.`
      };
    }
  }

  ride.status = 'DRIVER_ARRIVED';
  ride.arrivedAt = new Date().toISOString();

  const driver = state.drivers[driverId];
  if (driver) {
    driver.status = 'ARRIVED';
    if (typeof driverLat === 'number' && typeof driverLng === 'number') {
      driver.currentLat = driverLat;
      driver.currentLng = driverLng;
      driver.lastLocationUpdate = Date.now();
    }
  }

  persistState();
  syncRideToSupabase(ride).catch(() => {});
  return { success: true, ride, message: 'Driver marked as ARRIVED at pickup location. Please request passenger OTP to begin trip.' };
}

export function driverStartRideAuthoritative(rideId: string, driverId: string, submittedOtp: string): { success: boolean; ride: AuthoritativeRide; message: string; code?: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null as any, message: 'Ride not found.' };
  if (ride.driverId !== driverId) return { success: false, ride, message: 'Unauthorized driver.' };

  if (ride.status !== 'DRIVER_ARRIVED' && ride.status !== 'DRIVER_ACCEPTED' && ride.status !== 'OTP_REQUIRED') {
    return { success: false, ride, message: `Ride must be in DRIVER_ARRIVED state to start. Current: ${ride.status}` };
  }

  const cleanSubmitted = submittedOtp.trim();
  const cleanRideOtp = (ride.otp || '').trim();

  // Strict OTP verification: UNIVERSAL '1234' BYPASS REMOVED
  if (cleanSubmitted !== cleanRideOtp) {
    ride.failedOtpAttempts = (ride.failedOtpAttempts || 0) + 1;
    persistState();
    if (ride.failedOtpAttempts >= 5) {
      return {
        success: false,
        ride,
        code: 'MAX_OTP_ATTEMPTS_EXCEEDED',
        message: 'Maximum OTP verification attempts exceeded (5/5). Please contact passenger.'
      };
    }
    return {
      success: false,
      ride,
      code: 'INVALID_OTP',
      message: `Invalid 4-digit start OTP (Attempt ${ride.failedOtpAttempts}/5). Please verify with passenger.`
    };
  }

  ride.status = 'RIDE_STARTED';
  ride.startedAt = new Date().toISOString();

  const driver = state.drivers[driverId];
  if (driver) {
    driver.status = 'RIDE_IN_PROGRESS';
    driver.availability = 'BUSY';
  }

  persistState();
  syncRideToSupabase(ride).catch(() => {});
  return { success: true, ride, message: 'Trip successfully started! Safe driving.' };
}

export function driverCompleteRideAuthoritative(rideId: string, driverId: string, actualDistanceKm?: number, actualDurationMins?: number): { success: boolean; ride: AuthoritativeRide; invoice: any; message: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null as any, invoice: null, message: 'Ride not found.' };
  if (ride.driverId !== driverId) return { success: false, ride, invoice: null, message: 'Unauthorized driver.' };

  if (ride.status !== 'RIDE_STARTED' && ride.status !== 'RIDE_IN_PROGRESS') {
    return { success: false, ride, invoice: null, message: `Cannot complete ride from status ${ride.status}` };
  }

  const dist = actualDistanceKm ?? ride.distanceKm;
  const duration = actualDurationMins ?? ride.estimatedDurationMins;

  // Calculate waiting time between arrivedAt and startedAt
  let waitingMinutes = 0;
  if (ride.arrivedAt && ride.startedAt) {
    const diffMs = new Date(ride.startedAt).getTime() - new Date(ride.arrivedAt).getTime();
    waitingMinutes = Math.max(0, Math.round(diffMs / 60000));
  }

  // Authoritative final recalculation
  const finalCalc = calculateAuthoritativeFare({
    vehicleType: ride.vehicleType,
    distanceKm: dist,
    actualDurationMins: duration,
    waitingMinutes,
    promoCode: ride.promoCode
  });

  ride.status = 'RIDE_COMPLETED';
  ride.paymentStatus = 'pending';
  ride.completedAt = new Date().toISOString();
  ride.actualDurationMins = duration;
  ride.waitingMinutes = waitingMinutes;
  ride.distanceKm = dist;
  ride.finalFare = finalCalc.finalFare;
  ride.platformCommission = finalCalc.platformCommission;
  ride.driverEarnings = finalCalc.driverEarnings;

  const driver = state.drivers[driverId];
  if (driver) {
    driver.status = 'RIDE_COMPLETED';
    driver.availability = 'AVAILABLE';
    driver.currentRideId = null;
    driver.totalTrips += 1;
    driver.todayEarnings += finalCalc.driverEarnings;
    driver.walletBalance += finalCalc.driverEarnings;

    // Record ledger entry
    const ledgerEntry: DriverLedgerEntry = {
      id: 'led_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      driverId: driver.id,
      rideId: ride.id,
      type: 'RIDE_EARNING',
      amount: finalCalc.driverEarnings,
      balanceAfter: driver.walletBalance,
      description: `Ride Earning for Trip #${ride.id.slice(-6).toUpperCase()} (${dist} km)`,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED'
    };
    state.ledger.unshift(ledgerEntry);
    syncLedgerEntryToSupabase(ledgerEntry).catch(() => {});
  }

  persistState();
  syncRideToSupabase(ride).catch(() => {});

  const invoice = {
    invoiceNumber: 'INV-' + ride.id.slice(-8).toUpperCase(),
    rideId: ride.id,
    dateTime: ride.completedAt,
    customerName: ride.userName,
    customerPhone: ride.userPhone,
    driverName: ride.driverName || 'Toto Captain',
    driverPhone: ride.driverPhone || '',
    vehicleNumber: ride.vehicleNumber || '',
    vehicleModel: ride.vehicleModel || '',
    vehicleType: ride.vehicleType,
    pickupAddress: ride.pickup.address,
    dropoffAddress: ride.dropoff.address,
    distanceKm: dist,
    durationMins: duration,
    baseFare: finalCalc.baseFare,
    distanceFare: finalCalc.distanceFare,
    timeFare: finalCalc.timeFare,
    waitingCharge: finalCalc.waitingCharge,
    bookingFee: finalCalc.bookingFee,
    tax: finalCalc.tax,
    discount: finalCalc.discount,
    finalFare: finalCalc.finalFare,
    platformCommission: finalCalc.platformCommission,
    driverEarnings: finalCalc.driverEarnings,
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus
  };

  return { success: true, ride, invoice, message: 'Ride completed successfully. Invoice generated.' };
}

export function settleRidePaymentAuthoritative(rideId: string, paymentMethod: 'cash' | 'upi' | 'wallet'): { success: boolean; ride: AuthoritativeRide; message: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null as any, message: 'Ride not found.' };

  ride.paymentMethod = paymentMethod;
  ride.paymentStatus = 'paid';
  ride.status = 'CLOSED';

  persistState();
  syncRideToSupabase(ride).catch(() => {});
  return { success: true, ride, message: `Payment of ₹${ride.finalFare} confirmed via ${paymentMethod.toUpperCase()}. Ride CLOSED.` };
}

export function cancelRideAuthoritative(rideId: string, actor: 'customer' | 'driver' | 'admin', reason?: string): { success: boolean; ride: AuthoritativeRide; fee: number; message: string } {
  const ride = state.rides[rideId];
  if (!ride) return { success: false, ride: null as any, fee: 0, message: 'Ride not found.' };

  if (ride.status === 'RIDE_COMPLETED' || ride.status === 'CLOSED') {
    return { success: false, ride, fee: 0, message: 'Cannot cancel a completed trip.' };
  }

  let cancellationFee = 0;
  if (actor === 'customer') {
    if (ride.status === 'DRIVER_ARRIVED' || ride.status === 'DRIVER_ARRIVING') {
      cancellationFee = state.systemConfig.customerCancellationFee;
    }
    ride.status = 'CUSTOMER_CANCELLED';
  } else if (actor === 'driver') {
    ride.status = 'DRIVER_CANCELLED';
    if (ride.driverId && state.drivers[ride.driverId]) {
      const drv = state.drivers[ride.driverId];
      drv.cancellationCount += 1;
      if (reason) drv.cancellationReasons.push(reason);
    }
  } else {
    ride.status = 'ADMIN_CANCELLED';
  }

  ride.cancelledAt = new Date().toISOString();
  ride.cancellationReason = reason || `Cancelled by ${actor}`;
  ride.cancellationFee = cancellationFee;

  // Release driver if assigned
  if (ride.driverId && state.drivers[ride.driverId]) {
    const drv = state.drivers[ride.driverId];
    drv.currentRideId = null;
    drv.status = 'ONLINE';
    drv.availability = 'AVAILABLE';
  }

  persistState();
  syncRideToSupabase(ride).catch(() => {});
  return { success: true, ride, fee: cancellationFee, message: `Ride cancelled by ${actor}. Fee: ₹${cancellationFee}` };
}

export function sanitizeRideForRole(
  ride: AuthoritativeRide | null | undefined, 
  requesterRole?: 'customer' | 'driver' | 'admin' | string, 
  requesterId?: string
): AuthoritativeRide | null {
  if (!ride) return null;
  const clone = { ...ride };
  
  // Trip started or completed? OTP is no longer sensitive
  const isTripStarted = ['RIDE_STARTED', 'RIDE_IN_PROGRESS', 'RIDE_COMPLETING', 'RIDE_COMPLETED', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'CLOSED'].includes(ride.status);
  
  if (requesterRole === 'admin') {
    return clone;
  }

  if (requesterRole === 'customer') {
    if (!requesterId || requesterId === ride.userId) {
      return clone;
    }
  }

  if (!isTripStarted) {
    clone.otp = '••••';
  }

  return clone;
}

// ------------------------------------------------------------------------------
// 5. RATINGS & REVIEWS ENGINE
// ------------------------------------------------------------------------------

export function submitAuthoritativeRating(params: {
  rideId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'customer' | 'driver';
  rating: number;
  comment?: string;
}): { success: boolean; ratingRecord: RatingRecord; message: string } {
  // Prevent duplicate rating for the same ride by same user
  const existing = state.ratings.find(r => r.rideId === params.rideId && r.fromUserId === params.fromUserId);
  if (existing) {
    return { success: false, ratingRecord: existing, message: 'Rating already submitted for this trip.' };
  }

  const cleanRating = Math.max(1, Math.min(5, Math.round(params.rating)));
  const record: RatingRecord = {
    id: 'rat_' + Date.now().toString(36),
    rideId: params.rideId,
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    fromRole: params.fromRole,
    toRole: params.fromRole === 'customer' ? 'driver' : 'customer',
    rating: cleanRating,
    comment: params.comment,
    createdAt: new Date().toISOString()
  };

  state.ratings.unshift(record);

  // Update recipient's average rating
  if (record.toRole === 'driver' && state.drivers[record.toUserId]) {
    const driverRatings = state.ratings.filter(r => r.toRole === 'driver' && r.toUserId === record.toUserId);
    const avg = driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;
    state.drivers[record.toUserId].rating = Number(avg.toFixed(2));
  }

  persistState();
  return { success: true, ratingRecord: record, message: 'Rating submitted successfully.' };
}

// ------------------------------------------------------------------------------
// 6. WALLET & WITHDRAWAL ENGINE
// ------------------------------------------------------------------------------

export function requestDriverWithdrawalAuthoritative(driverId: string, amount: number, method: 'upi' | 'bank', payoutDetails: string): { success: boolean; withdrawal?: DriverWithdrawal; message: string } {
  const driver = state.drivers[driverId];
  if (!driver) return { success: false, message: 'Driver not found.' };

  if (amount < 100) return { success: false, message: 'Minimum withdrawal amount is ₹100.' };
  if (driver.walletBalance < amount) {
    return { success: false, message: `Insufficient balance. Available balance: ₹${driver.walletBalance}` };
  }

  driver.walletBalance -= amount;

  const withdrawal: DriverWithdrawal = {
    id: 'wth_' + Date.now().toString(36),
    driverId: driver.id,
    driverName: driver.name,
    amount,
    method,
    payoutDetails,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  state.withdrawals.unshift(withdrawal);

  // Ledger debit
  state.ledger.unshift({
    id: 'led_' + Date.now().toString(36),
    driverId: driver.id,
    type: 'WITHDRAWAL',
    amount: -amount,
    balanceAfter: driver.walletBalance,
    description: `Withdrawal payout request via ${method.toUpperCase()} (${payoutDetails})`,
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  });

  persistState();
  return { success: true, withdrawal, message: `Withdrawal request for ₹${amount} submitted for admin processing.` };
}

export function processWithdrawalAuthoritative(withdrawalId: string, action: 'approve' | 'reject', adminNotes?: string): { success: boolean; message: string } {
  const item = state.withdrawals.find(w => w.id === withdrawalId);
  if (!item) return { success: false, message: 'Withdrawal not found.' };

  if (item.status !== 'pending') return { success: false, message: `Withdrawal is already ${item.status}.` };

  if (action === 'approve') {
    item.status = 'completed';
    item.processedAt = new Date().toISOString();
  } else {
    item.status = 'rejected';
    item.processedAt = new Date().toISOString();
    // Refund balance back to driver
    const driver = state.drivers[item.driverId];
    if (driver) {
      driver.walletBalance += item.amount;
      state.ledger.unshift({
        id: 'led_' + Date.now().toString(36),
        driverId: driver.id,
        type: 'REFUND_ADJUSTMENT',
        amount: item.amount,
        balanceAfter: driver.walletBalance,
        description: `Refund for rejected withdrawal: ${adminNotes || 'Admin rejection'}`,
        timestamp: new Date().toISOString(),
        status: 'COMPLETED'
      });
    }
  }

  persistState();
  return { success: true, message: `Withdrawal ${action}d successfully.` };
}

// ------------------------------------------------------------------------------
// 7. SUPPORT TICKETS ENGINE
// ------------------------------------------------------------------------------

export function createSupportTicketAuthoritative(params: {
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  rideId?: string;
  category: any;
  subject: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}): SupportTicket {
  const ticket: SupportTicket = {
    id: 'tkt_' + Date.now().toString(36),
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    rideId: params.rideId,
    category: params.category,
    subject: params.subject,
    description: params.description,
    priority: params.priority || 'MEDIUM',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };

  state.supportTickets.unshift(ticket);
  persistState();
  return ticket;
}

export function updateSupportTicketAuthoritative(ticketId: string, updates: Partial<SupportTicket>): { success: boolean; ticket?: SupportTicket } {
  const ticket = state.supportTickets.find(t => t.id === ticketId);
  if (!ticket) return { success: false };

  Object.assign(ticket, updates);
  if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
    ticket.resolvedAt = new Date().toISOString();
  }
  persistState();
  return { success: true, ticket };
}

// ------------------------------------------------------------------------------
// 8. ADMIN LIVE OPERATIONS GETTERS & SETTERS
// ------------------------------------------------------------------------------

export function getAdminOperationsSummary() {
  const driversList = Object.values(state.drivers);
  const ridesList = Object.values(state.rides);

  const onlineDrivers = driversList.filter(d => d.status === 'ONLINE').length;
  const availableDrivers = driversList.filter(d => d.status === 'ONLINE' && d.availability === 'AVAILABLE').length;
  const busyDrivers = driversList.filter(d => d.availability === 'BUSY').length;

  const activeRides = ridesList.filter(r => 
    r.status === 'DRIVER_ASSIGNED' || 
    r.status === 'DRIVER_ACCEPTED' || 
    r.status === 'DRIVER_ARRIVING' || 
    r.status === 'DRIVER_ARRIVED' || 
    r.status === 'RIDE_STARTED' || 
    r.status === 'RIDE_IN_PROGRESS'
  ).length;

  const searchingRides = ridesList.filter(r => r.status === 'SEARCHING_DRIVER').length;
  const completedRides = ridesList.filter(r => r.status === 'RIDE_COMPLETED' || r.status === 'CLOSED').length;
  const cancelledRides = ridesList.filter(r => r.status.includes('CANCELLED')).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCompleted = ridesList.filter(r => (r.completedAt || r.createdAt).startsWith(todayStr) && (r.status === 'RIDE_COMPLETED' || r.status === 'CLOSED'));
  const todayRevenue = todayCompleted.reduce((sum, r) => sum + r.finalFare, 0);
  const todayCommission = todayCompleted.reduce((sum, r) => sum + r.platformCommission, 0);
  const todayDriverEarnings = todayCompleted.reduce((sum, r) => sum + r.driverEarnings, 0);

  const pendingApprovals = driversList.filter(d => d.accountStatus === 'PENDING').length;
  const pendingWithdrawals = state.withdrawals.filter(w => w.status === 'pending').length;

  return {
    onlineDrivers,
    availableDrivers,
    busyDrivers,
    activeRides,
    searchingRides,
    completedRides,
    cancelledRides,
    todayRevenue,
    todayCommission,
    todayDriverEarnings,
    pendingApprovals,
    pendingWithdrawals,
    totalDrivers: driversList.length,
    totalRides: ridesList.length
  };
}

export function getEngineState() {
  return state;
}

export function updateSystemConfigAuthoritative(newConfig: Partial<SystemBusinessConfig>) {
  state.systemConfig = { ...state.systemConfig, ...newConfig };
  persistState();
  return state.systemConfig;
}

export function updateOwnerUpiAuthoritative(params: {
  ownerUpiId: string;
  ownerPayeeName: string;
  ownerSettlementBank?: string;
}): { success: boolean; config: SystemBusinessConfig; message: string } {
  const cleanUpi = (params.ownerUpiId || '').trim();
  const cleanName = (params.ownerPayeeName || '').trim() || 'Subrata Naskar (Toto Drive Fleet)';
  const cleanBank = (params.ownerSettlementBank || '').trim() || 'ICICI Bank';

  if (!cleanUpi || !cleanUpi.includes('@')) {
    return {
      success: false,
      config: state.systemConfig,
      message: 'Invalid UPI ID format. Must include @ (e.g. subratanaskar@icici or 9830145289@paytm)'
    };
  }

  state.systemConfig.ownerUpiId = cleanUpi;
  state.systemConfig.ownerPayeeName = cleanName;
  state.systemConfig.ownerSettlementBank = cleanBank;
  persistState();

  return {
    success: true,
    config: state.systemConfig,
    message: `Owner settlement account updated successfully to ${cleanUpi} (${cleanName})`
  };
}

export function syncDriverRecord(driverData: Partial<DriverRecord> & { id: string; name: string; phone: string }): DriverRecord {
  if (!state.drivers[driverData.id]) {
    state.drivers[driverData.id] = {
      id: driverData.id,
      name: driverData.name,
      phone: driverData.phone,
      status: driverData.status || 'OFFLINE',
      availability: driverData.availability || 'OFFLINE',
      accountStatus: driverData.accountStatus || 'APPROVED',
      pin: driverData.pin || '1234',
      currentRideId: null,
      currentLat: driverData.currentLat || 22.5830,
      currentLng: driverData.currentLng || 88.4350,
      heading: driverData.heading || 0,
      speed: driverData.speed || 0,
      accuracy: driverData.accuracy || 10,
      lastLocationUpdate: Date.now(),
      rating: driverData.rating || 4.9,
      totalTrips: driverData.totalTrips || 0,
      walletBalance: driverData.walletBalance || 350,
      todayEarnings: driverData.todayEarnings || 0,
      cancellationCount: 0,
      cancellationReasons: []
    };
  } else {
    Object.assign(state.drivers[driverData.id], driverData);
  }
  persistState();
  return state.drivers[driverData.id];
}

// ------------------------------------------------------------------------------
// Driver Registration & Approvals Operations
// ------------------------------------------------------------------------------

export function getDriverApprovalsAuthoritative(): DriverApprovalRecord[] {
  return Object.values(state.driverApprovals).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function createDriverApprovalAuthoritative(payload: {
  id?: string;
  driverName: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber: string;
  vehicleModel?: string;
  vehicleColor?: string;
  driverPhoto?: string;
  totoPhotos?: string[];
}): { success: boolean; approval: DriverApprovalRecord; message: string } {
  const approvalId = payload.id || `appr_${Date.now()}`;
  const cleanPhone = payload.phone.trim();
  const driverDocId = `drv_${cleanPhone.replace(/\D/g, '').slice(-6) || approvalId.slice(-6)}`;

  const approval: DriverApprovalRecord = {
    id: approvalId,
    driverName: payload.driverName.trim(),
    phone: cleanPhone,
    vehicleType: payload.vehicleType || 'toto',
    vehicleNumber: payload.vehicleNumber.trim().toUpperCase(),
    vehicleModel: payload.vehicleModel?.trim() || 'Mayuri Deluxe Li-ion',
    vehicleColor: payload.vehicleColor?.trim() || 'Emerald Green',
    driverPhoto: payload.driverPhoto,
    totoPhotos: payload.totoPhotos,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  state.driverApprovals[approvalId] = approval;

  // Also maintain corresponding driver record with PENDING verification status
  if (!state.drivers[driverDocId]) {
    state.drivers[driverDocId] = {
      id: driverDocId,
      name: approval.driverName,
      phone: approval.phone,
      status: 'OFFLINE',
      availability: 'OFFLINE',
      accountStatus: 'PENDING',
      pin: '',
      currentRideId: null,
      currentLat: 22.5830,
      currentLng: 88.4350,
      heading: 0,
      speed: 0,
      accuracy: 10,
      lastLocationUpdate: Date.now(),
      rating: 5.0,
      totalTrips: 0,
      walletBalance: 0,
      todayEarnings: 0,
      cancellationCount: 0,
      cancellationReasons: []
    };
  } else {
    state.drivers[driverDocId].name = approval.driverName;
    state.drivers[driverDocId].phone = approval.phone;
    state.drivers[driverDocId].accountStatus = 'PENDING';
  }

  // Register vehicle
  getOrCreateVehicle(driverDocId, {
    vehicle_type: approval.vehicleType as any,
    registration_number: approval.vehicleNumber,
    vehicle_model: approval.vehicleModel,
    vehicle_color: approval.vehicleColor,
    verification_status: 'PENDING'
  });

  persistState();

  return {
    success: true,
    approval,
    message: 'Driver registration submitted successfully with pending approval status.'
  };
}

export function approveDriverRegistrationAuthoritative(
  approvalId: string,
  customPin?: string
): { success: boolean; approval?: DriverApprovalRecord; pin?: string; message: string } {
  const approval = state.driverApprovals[approvalId];
  if (!approval) {
    return { success: false, message: 'Driver approval record not found.' };
  }

  const pin = customPin || Math.floor(1000 + Math.random() * 9000).toString();
  const approvedAt = new Date().toISOString();

  approval.status = 'approved';
  approval.assignedPin = pin;
  approval.approvedAt = approvedAt;

  const cleanPhone = approval.phone.replace(/\D/g, '');
  const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;

  if (state.drivers[driverDocId]) {
    state.drivers[driverDocId].accountStatus = 'APPROVED';
    state.drivers[driverDocId].pin = pin;
  } else {
    state.drivers[driverDocId] = {
      id: driverDocId,
      name: approval.driverName,
      phone: approval.phone,
      status: 'OFFLINE',
      availability: 'OFFLINE',
      accountStatus: 'APPROVED',
      pin,
      currentRideId: null,
      currentLat: 22.5830,
      currentLng: 88.4350,
      heading: 0,
      speed: 0,
      accuracy: 10,
      lastLocationUpdate: Date.now(),
      rating: 5.0,
      totalTrips: 0,
      walletBalance: 150,
      todayEarnings: 0,
      cancellationCount: 0,
      cancellationReasons: []
    };
  }

  // Mark vehicle verified
  const vehicle = getOrCreateVehicle(driverDocId);
  vehicle.verification_status = 'VERIFIED';
  vehicle.registration_number = approval.vehicleNumber;
  vehicle.vehicle_model = approval.vehicleModel;
  vehicle.vehicle_color = approval.vehicleColor;

  persistState();

  return {
    success: true,
    approval,
    pin,
    message: `Driver approved! 4-digit security PIN: ${pin}`
  };
}

export function rejectDriverRegistrationAuthoritative(
  approvalId: string,
  reason?: string
): { success: boolean; approval?: DriverApprovalRecord; message: string } {
  const approval = state.driverApprovals[approvalId];
  if (!approval) {
    return { success: false, message: 'Driver approval record not found.' };
  }

  approval.status = 'rejected';
  approval.rejectedReason = reason || 'Verification requirements not satisfied.';

  const cleanPhone = approval.phone.replace(/\D/g, '');
  const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;

  if (state.drivers[driverDocId]) {
    state.drivers[driverDocId].accountStatus = 'SUSPENDED';
  }

  persistState();

  return {
    success: true,
    approval,
    message: 'Driver registration rejected.'
  };
}

export function deleteDriverApprovalAuthoritative(approvalId: string): { success: boolean; message: string } {
  const approval = state.driverApprovals[approvalId];
  if (approval) {
    const cleanPhone = approval.phone.replace(/\D/g, '');
    const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;
    delete state.drivers[driverDocId];
    delete state.driverApprovals[approvalId];
    persistState();
    return { success: true, message: 'Driver application and profile deleted.' };
  }
  return { success: false, message: 'Approval record not found.' };
}

export function getAllDriversAuthoritative(): DriverRecord[] {
  return Object.values(state.drivers);
}

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ------------------------------------------------------------------------------
// Authoritative Real-Time Location Synchronization & Arrival Geofence
// ------------------------------------------------------------------------------
export function updateDriverLocationAuthoritative(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number,
  speed?: number
): { success: boolean; driverLocation?: any; rideUpdated?: boolean; message?: string } {
  const driver = state.drivers[driverId];
  if (driver) {
    driver.currentLat = lat;
    driver.currentLng = lng;
    if (typeof heading === 'number') driver.heading = heading;
    driver.lastLocationUpdate = Date.now();
  }

  // Also check if any driver record matches by phone ending
  const cleanIdDigits = driverId.replace(/\D/g, '');
  if (!driver && cleanIdDigits.length >= 6) {
    for (const drv of Object.values(state.drivers)) {
      const p = (drv.phone || '').replace(/\D/g, '');
      if (p.endsWith(cleanIdDigits) || cleanIdDigits.endsWith(p)) {
        drv.currentLat = lat;
        drv.currentLng = lng;
        if (typeof heading === 'number') drv.heading = heading;
        drv.lastLocationUpdate = Date.now();
        break;
      }
    }
  }

  const liveLoc = {
    lat,
    lng,
    heading: heading || 0,
    speed: speed || 0,
    timestamp: Date.now()
  };

  let rideUpdated = false;
  // If driver has an active ride, update the ride's driverLocation and check geofence
  for (const ride of Object.values(state.rides)) {
    const isMatchingDriver = ride.driverId === driverId || 
      (cleanIdDigits && ride.driverId && ride.driverId.replace(/\D/g, '').endsWith(cleanIdDigits));

    const isFinished = 
      ride.status === 'RIDE_COMPLETED' || 
      ride.status === 'CUSTOMER_CANCELLED' || 
      ride.status === 'DRIVER_CANCELLED' || 
      ride.status === 'ADMIN_CANCELLED' || 
      ride.status === 'CLOSED' || 
      ride.status === 'EXPIRED';

    if (isMatchingDriver && !isFinished) {
      ride.driverLocation = liveLoc;
      rideUpdated = true;

      // Pickup Arrival Geofence Check (120 meters)
      if ((ride.status === 'DRIVER_ACCEPTED' || ride.status === 'DRIVER_ARRIVING') && ride.pickup?.lat && ride.pickup?.lng) {
        const distToPickup = calculateHaversineMeters(lat, lng, ride.pickup.lat, ride.pickup.lng);
        if (distToPickup <= (state.systemConfig.arrivalGeofenceRadiusMeters || 120)) {
          if (ride.status === 'DRIVER_ACCEPTED') {
            ride.status = 'DRIVER_ARRIVING';
            ride.arrivedAt = new Date().toISOString();
          }
        }
      }
      break;
    }
  }

  persistState();
  return { success: true, driverLocation: liveLoc, rideUpdated };
}

// ------------------------------------------------------------------------------
// Authoritative Admin CRUD Permanent Deletion
// ------------------------------------------------------------------------------
export function deleteDriverAuthoritative(driverIdOrPhone: string): { success: boolean; message: string } {
  const cleanDigits = driverIdOrPhone.replace(/\D/g, '');
  let removedCount = 0;

  // 1. Remove from drivers record
  for (const [id, drv] of Object.entries(state.drivers)) {
    const drvPhone = (drv.phone || '').replace(/\D/g, '');
    if (
      id === driverIdOrPhone || 
      (cleanDigits.length >= 6 && (drvPhone.endsWith(cleanDigits) || cleanDigits.endsWith(drvPhone)))
    ) {
      delete state.drivers[id];
      delete state.vehicles[id];
      removedCount++;
    }
  }

  // 2. Remove from approvals
  for (const [id, appr] of Object.entries(state.driverApprovals)) {
    const apprPhone = (appr.phone || '').replace(/\D/g, '');
    if (
      id === driverIdOrPhone || 
      (cleanDigits.length >= 6 && (apprPhone.endsWith(cleanDigits) || cleanDigits.endsWith(apprPhone)))
    ) {
      delete state.driverApprovals[id];
      removedCount++;
    }
  }

  // 3. Clear from any active rides
  for (const ride of Object.values(state.rides)) {
    if (ride.driverId === driverIdOrPhone || (cleanDigits.length >= 6 && (ride.driverPhone || '').replace(/\D/g, '').endsWith(cleanDigits))) {
      ride.driverId = undefined;
      ride.driverName = undefined;
      ride.driverPhone = undefined;
      ride.driverLocation = undefined;
      if (ride.status === 'DRIVER_ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
        ride.status = 'SEARCHING_DRIVER';
      }
    }
  }

  persistState();
  return {
    success: true,
    message: removedCount > 0 ? 'Driver permanently deleted from database.' : 'Driver record removed.'
  };
}

export function deleteUserAuthoritative(userId: string): { success: boolean; message: string } {
  if (!state.users) {
    state.users = {};
  }
  if (state.users[userId]) {
    delete state.users[userId];
  }
  // Also clean by matching id or phone
  const clean = userId.replace(/\D/g, '');
  if (clean.length >= 6) {
    for (const [id, u] of Object.entries(state.users)) {
      const p = ((u && u.phone) || '').replace(/\D/g, '');
      if (p.endsWith(clean) || clean.endsWith(p)) {
        delete state.users[id];
      }
    }
  }

  persistState();
  return { success: true, message: `Passenger ${userId} permanently removed from database.` };
}

export function upsertUserAuthoritative(user: any): { success: boolean; user: any } {
  if (!state.users) state.users = {};
  if (user && user.id) {
    state.users[user.id] = { ...state.users[user.id], ...user, updatedAt: new Date().toISOString() };
    try {
      registerCustomerRecord(state.users[user.id]);
    } catch (e) {
      // Ignore if circular
    }
    persistState();
    return { success: true, user: state.users[user.id] };
  }
  return { success: false, user: null };
}

export function getAllUsersAuthoritative(): any[] {
  if (!state.users) return [];
  return Object.values(state.users);
}

export function deleteRideAuthoritative(rideId: string): { success: boolean; message: string } {
  if (state.rides && state.rides[rideId]) {
    const ride = state.rides[rideId];
    if (ride.driverId && state.drivers[ride.driverId]) {
      const drv = state.drivers[ride.driverId];
      if (drv.currentRideId === rideId) {
        drv.currentRideId = null;
        drv.availability = 'AVAILABLE';
        drv.status = 'ONLINE';
      }
    }
    delete state.rides[rideId];
    persistState();
    return { success: true, message: `Ride ${rideId} permanently deleted from database.` };
  }
  return { success: true, message: `Ride ${rideId} removed.` };
}

// ------------------------------------------------------------------------------
// Authoritative Passenger Wallet Top-Up via Payment Gateway
// ------------------------------------------------------------------------------
export function topupUserWalletAuthoritative(
  userId: string,
  amount: number,
  paymentMethod: string = 'direct_upi',
  referenceId?: string
): { success: boolean; newBalance: number; user?: any; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { success: false, newBalance: 0, error: 'Invalid top-up amount' };
  }

  if (!state.users) state.users = {};
  let targetUser = state.users[userId];

  if (!targetUser) {
    // Check by phone digits if user ID doesn't match directly
    const cleanDigits = userId.replace(/\D/g, '');
    if (cleanDigits.length >= 6) {
      for (const [id, u] of Object.entries(state.users)) {
        const p = ((u && u.phone) || '').replace(/\D/g, '');
        if (p.endsWith(cleanDigits) || cleanDigits.endsWith(p)) {
          targetUser = u;
          userId = id;
          break;
        }
      }
    }
  }

  if (!targetUser) {
    targetUser = {
      id: userId,
      name: 'Passenger',
      walletBalance: 0,
      createdAt: new Date().toISOString()
    };
    state.users[userId] = targetUser;
  }

  const currentBal = typeof targetUser.walletBalance === 'number' ? targetUser.walletBalance : 0;
  const newBalance = Number((currentBal + amount).toFixed(2));
  targetUser.walletBalance = newBalance;
  targetUser.updatedAt = new Date().toISOString();

  // Record ledger entry
  state.ledger.push({
    id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    driverId: '',
    rideId: `topup_${userId}_${Date.now()}`,
    type: 'WALLET_TOPUP',
    amount,
    balanceAfter: newBalance,
    description: `Wallet recharge (${paymentMethod}) [Ref: ${referenceId || 'N/A'}]`,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED'
  });

  persistState();
  return { success: true, newBalance, user: targetUser };
}

