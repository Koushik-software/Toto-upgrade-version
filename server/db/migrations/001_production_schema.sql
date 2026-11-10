-- ==============================================================================
-- TOTO DRIVE PRODUCTION DATABASE MIGRATION 001
-- Relational Schema DDL for PostgreSQL / Cloud SQL / Supabase
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'driver', 'admin')),
  wallet_balance INTEGER DEFAULT 0,
  upi_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Passenger Profiles
CREATE TABLE IF NOT EXISTS passenger_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  preferred_language TEXT DEFAULT 'bn',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  home_address TEXT,
  home_lat DOUBLE PRECISION,
  home_lng DOUBLE PRECISION,
  work_address TEXT,
  work_lat DOUBLE PRECISION,
  work_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_passenger_profiles_user_id ON passenger_profiles(user_id);

-- 3. Captain Profiles
CREATE TABLE IF NOT EXISTS captain_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin_hash TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  is_online BOOLEAN DEFAULT false,
  availability TEXT DEFAULT 'OFFLINE' CHECK (availability IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
  rating NUMERIC(3, 2) DEFAULT 4.90,
  battery_percentage INTEGER DEFAULT 90,
  total_trips INTEGER DEFAULT 0,
  today_earnings NUMERIC(10, 2) DEFAULT 0.00,
  wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
  cancellation_count INTEGER DEFAULT 0,
  vehicle_id TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  heading DOUBLE PRECISION DEFAULT 0,
  speed DOUBLE PRECISION DEFAULT 0,
  last_location_update TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_captain_profiles_phone ON captain_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_captain_profiles_status ON captain_profiles(approval_status, is_online, availability);

-- 4. Captain Documents
CREATE TABLE IF NOT EXISTS captain_documents (
  id TEXT PRIMARY KEY,
  captain_id TEXT NOT NULL REFERENCES captain_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('DRIVING_LICENSE', 'VEHICLE_RC', 'INSURANCE', 'COMMERCIAL_PERMIT', 'AADHAAR')),
  document_number TEXT,
  document_url TEXT NOT NULL,
  expiry_date TEXT,
  verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_captain_docs_captain_id ON captain_documents(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_docs_status ON captain_documents(verification_status);

-- 5. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  captain_id TEXT REFERENCES captain_profiles(id) ON DELETE SET NULL,
  vehicle_type TEXT DEFAULT 'toto' CHECK (vehicle_type IN ('toto', 'toto_express', 'toto_deluxe', 'full_reserve_toto', 'bike', 'auto')),
  registration_number TEXT NOT NULL UNIQUE,
  make_model TEXT NOT NULL,
  color TEXT DEFAULT 'Emerald Green',
  capacity INTEGER DEFAULT 4,
  verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
  inspection_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_captain ON vehicles(captain_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON vehicles(registration_number);

-- 6. Rides
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid),
  driver_id TEXT REFERENCES captain_profiles(id),
  driver_name TEXT,
  vehicle_type TEXT DEFAULT 'toto',
  vehicle_number TEXT,
  pickup_name TEXT NOT NULL,
  pickup_address TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_name TEXT NOT NULL,
  dropoff_address TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  distance_km TEXT,
  fare INTEGER NOT NULL,
  base_fare INTEGER DEFAULT 20,
  distance_fare INTEGER DEFAULT 0,
  time_fare INTEGER DEFAULT 0,
  waiting_charge INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  coupon_discount INTEGER DEFAULT 0,
  platform_commission INTEGER DEFAULT 0,
  driver_earnings INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  otp TEXT,
  failed_otp_attempts INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'wallet')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  cancellation_reason TEXT,
  cancellation_fee INTEGER DEFAULT 0,
  customer_rating INTEGER,
  driver_rating INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rides_user ON rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_created ON rides(created_at DESC);

-- 7. Ride Events
CREATE TABLE IF NOT EXISTS ride_events (
  id SERIAL PRIMARY KEY,
  ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'captain', 'admin', 'system')),
  actor_id TEXT,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ride_events_ride_id ON ride_events(ride_id);

-- 8. GPS Locations
CREATE TABLE IF NOT EXISTS gps_locations (
  id SERIAL PRIMARY KEY,
  captain_id TEXT NOT NULL REFERENCES captain_profiles(id) ON DELETE CASCADE,
  ride_id TEXT REFERENCES rides(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION DEFAULT 0,
  speed DOUBLE PRECISION DEFAULT 0,
  accuracy DOUBLE PRECISION DEFAULT 5,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gps_captain_time ON gps_locations(captain_id, timestamp DESC);

-- 9. Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'captain', 'platform')),
  owner_id TEXT NOT NULL UNIQUE,
  balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0.00),
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_type, owner_id);

-- 10. Wallet Ledger Entries
CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RIDE_FARE', 'COMMISSION', 'WALLET_TOPUP', 'WITHDRAWAL', 'REFUND', 'INCENTIVE', 'PENALTY')),
  amount NUMERIC(12, 2) NOT NULL,
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_time ON wallet_ledger_entries(wallet_id, created_at DESC);

-- 11. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  gateway_session_id TEXT,
  gateway TEXT DEFAULT 'YOUPI_UPI' CHECK (gateway IN ('YOUPI_UPI', 'CASH', 'WALLET', 'DIRECT_UPI')),
  user_id TEXT,
  ride_id TEXT REFERENCES rides(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'ACTIVE', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'FAILED')),
  utr TEXT,
  qr_url TEXT,
  deep_link TEXT,
  webhook_payload JSONB,
  verified_by_admin_id TEXT,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON payment_transactions(utr);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);

-- 12. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  payment_transaction_id TEXT REFERENCES payment_transactions(id),
  ride_id TEXT REFERENCES rides(id),
  wallet_id TEXT REFERENCES wallets(id),
  user_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'REJECTED')),
  processed_by_admin_id TEXT,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'captain', 'admin')),
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'PUSH', 'SMS')),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT DEFAULT 'DELIVERED' CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'FAILED')),
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id, status);

-- 14. Admin Accounts
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'fleet_manager', 'support_agent')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  session_version INTEGER DEFAULT 1,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_username TEXT,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, timestamp DESC);
