import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  numeric, 
  timestamp, 
  boolean, 
  doublePrecision, 
  jsonb 
} from 'drizzle-orm/pg-core';

// ==============================================================================
// 1. Users Table (Core Identity linked to Firebase / Auth UID)
// ==============================================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID / App User UID
  email: text('email'),
  name: text('name'),
  phone: text('phone'),
  role: text('role').default('user'), // 'user' | 'driver' | 'admin'
  walletBalance: integer('wallet_balance').default(0),
  upiId: text('upi_id'),
  status: text('status').default('active'), // 'active' | 'suspended' | 'deleted'
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 2. Passenger Profiles Table
// ==============================================================================
export const passengerProfiles = pgTable('passenger_profiles', {
  id: text('id').primaryKey(), // e.g. usr_123 or uid
  userId: text('user_id').references(() => users.uid, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  phone: text('phone'),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('5.00'),
  totalRides: integer('total_rides').default(0),
  preferredLanguage: text('preferred_language').default('bn'), // 'bn' | 'hi' | 'en'
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  homeAddress: text('home_address'),
  homeLat: doublePrecision('home_lat'),
  homeLng: doublePrecision('home_lng'),
  workAddress: text('work_address'),
  workLat: doublePrecision('work_lat'),
  workLng: doublePrecision('work_lng'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 3. Captain Profiles Table
// ==============================================================================
export const captainProfiles = pgTable('captain_profiles', {
  id: text('id').primaryKey(), // e.g. drv_1 or uid
  userId: text('user_id').references(() => users.uid),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  pinHash: text('pin_hash'),
  approvalStatus: text('approval_status').default('pending'), // 'pending' | 'approved' | 'rejected' | 'suspended'
  isOnline: boolean('is_online').default(false),
  availability: text('availability').default('OFFLINE'), // 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  rating: numeric('rating', { precision: 3, scale: 2 }).default('4.90'),
  batteryPercentage: integer('battery_percentage').default(90),
  totalTrips: integer('total_trips').default(0),
  todayEarnings: numeric('today_earnings', { precision: 10, scale: 2 }).default('0.00'),
  walletBalance: numeric('wallet_balance', { precision: 10, scale: 2 }).default('0.00'),
  cancellationCount: integer('cancellation_count').default(0),
  vehicleId: text('vehicle_id'),
  currentLat: doublePrecision('current_lat'),
  currentLng: doublePrecision('current_lng'),
  heading: doublePrecision('heading').default(0),
  speed: doublePrecision('speed').default(0),
  lastLocationUpdate: timestamp('last_location_update'),
  approvedAt: timestamp('approved_at'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 4. Captain Documents Table (Structured KYC verification)
// ==============================================================================
export const captainDocuments = pgTable('captain_documents', {
  id: text('id').primaryKey(),
  captainId: text('captain_id').notNull(),
  documentType: text('document_type').notNull(), // 'DRIVING_LICENSE' | 'VEHICLE_RC' | 'INSURANCE' | 'COMMERCIAL_PERMIT' | 'AADHAAR'
  documentNumber: text('document_number'),
  documentUrl: text('document_url').notNull(),
  expiryDate: text('expiry_date'),
  verificationStatus: text('verification_status').default('PENDING'), // 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 5. Vehicles Table
// ==============================================================================
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  captainId: text('captain_id'),
  vehicleType: text('vehicle_type').default('toto'), // 'toto' | 'toto_express' | 'toto_deluxe' | 'full_reserve_toto' | 'bike' | 'auto'
  registrationNumber: text('registration_number').notNull(),
  makeModel: text('make_model').notNull(),
  color: text('color').default('Emerald Green'),
  capacity: integer('capacity').default(4),
  verificationStatus: text('verification_status').default('PENDING'), // 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  inspectionDate: text('inspection_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 6. Rides Table
// ==============================================================================
export const rides = pgTable('rides', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid),
  driverId: text('driver_id'),
  driverName: text('driver_name'),
  vehicleType: text('vehicle_type').default('toto'),
  vehicleNumber: text('vehicle_number'),
  pickupName: text('pickup_name').notNull(),
  pickupAddress: text('pickup_address'),
  pickupLat: doublePrecision('pickup_lat'),
  pickupLng: doublePrecision('pickup_lng'),
  dropoffName: text('dropoff_name').notNull(),
  dropoffAddress: text('dropoff_address'),
  dropoffLat: doublePrecision('dropoff_lat'),
  dropoffLng: doublePrecision('dropoff_lng'),
  distanceKm: text('distance_km'),
  fare: integer('fare').notNull(),
  baseFare: integer('base_fare').default(20),
  distanceFare: integer('distance_fare').default(0),
  timeFare: integer('time_fare').default(0),
  waitingCharge: integer('waiting_charge').default(0),
  tax: integer('tax').default(0),
  couponDiscount: integer('coupon_discount').default(0),
  platformCommission: integer('platform_commission').default(0),
  driverEarnings: integer('driver_earnings').default(0),
  status: text('status').notNull(), // 'SEARCHING_DRIVER' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'RIDE_STARTED' | 'RIDE_IN_PROGRESS' | 'RIDE_COMPLETED' | 'PAYMENT_COMPLETED' | 'CLOSED' | 'CANCELLED' | 'CUSTOMER_CANCELLED' | 'DRIVER_CANCELLED' | 'EXPIRED'
  otp: text('otp'),
  failedOtpAttempts: integer('failed_otp_attempts').default(0),
  paymentMethod: text('payment_method').default('cash'), // 'cash' | 'upi' | 'wallet'
  paymentStatus: text('payment_status').default('pending'), // 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  cancellationReason: text('cancellation_reason'),
  cancellationFee: integer('cancellation_fee').default(0),
  customerRating: integer('customer_rating'),
  driverRating: integer('driver_rating'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 7. Ride Events Table (Immutable State Machine Audit)
// ==============================================================================
export const rideEvents = pgTable('ride_events', {
  id: serial('id').primaryKey(),
  rideId: text('ride_id').notNull(),
  eventType: text('event_type').notNull(), // 'STATE_CHANGE' | 'OTP_ATTEMPT' | 'CANCELLATION' | 'PAYMENT'
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  actorType: text('actor_type').notNull(), // 'customer' | 'captain' | 'admin' | 'system'
  actorId: text('actor_id'),
  note: text('note'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==============================================================================
// 8. GPS Locations Table (High-Fidelity Telemetry Traces)
// ==============================================================================
export const gpsLocations = pgTable('gps_locations', {
  id: serial('id').primaryKey(),
  captainId: text('captain_id').notNull(),
  rideId: text('ride_id'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  heading: doublePrecision('heading').default(0),
  speed: doublePrecision('speed').default(0),
  accuracy: doublePrecision('accuracy').default(5),
  timestamp: timestamp('timestamp').defaultNow(),
});

// ==============================================================================
// 9. Wallets Table
// ==============================================================================
export const wallets = pgTable('wallets', {
  id: text('id').primaryKey(),
  ownerType: text('owner_type').notNull(), // 'user' | 'captain' | 'platform'
  ownerId: text('owner_id').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  currency: text('currency').default('INR'),
  status: text('status').default('active'), // 'active' | 'frozen' | 'suspended'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 10. Wallet Ledger Entries Table (Double-Entry Financial Journal)
// ==============================================================================
export const walletLedgerEntries = pgTable('wallet_ledger_entries', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').references(() => wallets.id).notNull(),
  transactionType: text('transaction_type').notNull(), // 'RIDE_FARE' | 'COMMISSION' | 'WALLET_TOPUP' | 'WITHDRAWAL' | 'REFUND' | 'INCENTIVE' | 'PENALTY'
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: numeric('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  referenceType: text('reference_type'), // 'ride' | 'payment' | 'withdrawal' | 'admin'
  referenceId: text('reference_id'),
  description: text('description').notNull(),
  status: text('status').default('COMPLETED'), // 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: timestamp('created_at').defaultNow(),
});

// ==============================================================================
// 11. Payment Transactions Table (YouPI-PG UPI & Settlements)
// ==============================================================================
export const paymentTransactions = pgTable('payment_transactions', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  gatewaySessionId: text('gateway_session_id'),
  gateway: text('gateway').default('YOUPI_UPI'), // 'YOUPI_UPI' | 'CASH' | 'WALLET' | 'DIRECT_UPI'
  userId: text('user_id'),
  rideId: text('ride_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  status: text('status').default('INITIATED'), // 'INITIATED' | 'ACTIVE' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'FAILED'
  utr: text('utr'),
  qrUrl: text('qr_url'),
  deepLink: text('deep_link'),
  webhookPayload: jsonb('webhook_payload'),
  verifiedByAdminId: text('verified_by_admin_id'),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 12. Refunds Table
// ==============================================================================
export const refunds = pgTable('refunds', {
  id: text('id').primaryKey(),
  paymentTransactionId: text('payment_transaction_id'),
  rideId: text('ride_id'),
  walletId: text('wallet_id'),
  userId: text('user_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('PENDING'), // 'PENDING' | 'PROCESSED' | 'REJECTED'
  processedByAdminId: text('processed_by_admin_id'),
  processedAt: timestamp('processed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==============================================================================
// 13. Notifications Table
// ==============================================================================
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientType: text('recipient_type').notNull(), // 'user' | 'captain' | 'admin'
  recipientId: text('recipient_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  channel: text('channel').default('IN_APP'), // 'IN_APP' | 'PUSH' | 'SMS'
  priority: text('priority').default('NORMAL'), // 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: text('status').default('DELIVERED'), // 'PENDING' | 'DELIVERED' | 'READ' | 'FAILED'
  data: jsonb('data'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==============================================================================
// 14. Admin Accounts Table (RBAC with PBKDF2)
// ==============================================================================
export const adminAccounts = pgTable('admin_accounts', {
  id: text('id').primaryKey(), // e.g. ADMIN_001
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('super_admin'), // 'super_admin' | 'fleet_manager' | 'support_agent'
  status: text('status').default('active'), // 'active' | 'suspended'
  sessionVersion: integer('session_version').default(1),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// 15. Audit Logs Table (Tamper-Evident Admin & Financial Actions)
// ==============================================================================
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id'),
  adminUsername: text('admin_username'),
  action: text('action').notNull(),
  targetResource: text('target_resource').notNull(),
  targetId: text('target_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// ==============================================================================
// 16. Support Tickets Table (Preserved for compatibility)
// ==============================================================================
export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name'),
  userRole: text('user_role'),
  rideId: text('ride_id'),
  category: text('category').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  itemDetails: text('item_details'),
  status: text('status').default('open'),
  adminReply: text('admin_reply'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==============================================================================
// Relationships
// ==============================================================================
export const usersRelations = relations(users, ({ many, one }) => ({
  rides: many(rides),
  profile: one(passengerProfiles, {
    fields: [users.uid],
    references: [passengerProfiles.userId],
  }),
}));

export const passengerProfilesRelations = relations(passengerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [passengerProfiles.userId],
    references: [users.uid],
  }),
}));

export const ridesRelations = relations(rides, ({ one, many }) => ({
  user: one(users, {
    fields: [rides.userId],
    references: [users.uid],
  }),
  events: many(rideEvents),
}));

export const walletsRelations = relations(wallets, ({ many }) => ({
  ledgerEntries: many(walletLedgerEntries),
}));

export const walletLedgerEntriesRelations = relations(walletLedgerEntries, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletLedgerEntries.walletId],
    references: [wallets.id],
  }),
}));
