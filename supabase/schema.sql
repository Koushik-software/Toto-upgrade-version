-- ==============================================================================
-- Toto Drive - Supabase PostgreSQL Database Schema & Row-Level Security (RLS)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to initialize all required tables, triggers, and Row-Level Security policies.
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- Table: public.profiles
-- User / Passenger account profile linked to auth.users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT DEFAULT 'Passenger',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  wallet_balance NUMERIC(10, 2) DEFAULT 250.00,
  rating NUMERIC(3, 2) DEFAULT 4.95,
  total_rides INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'driver', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto Trigger: Automatically create public.profiles row upon auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, avatar_url, wallet_balance, rating, total_rides, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Passenger'),
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/micah/svg?seed=' || NEW.id::text),
    250.00,
    4.95,
    0,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Table: public.saved_places
-- Passenger's favorite places (Home, Work, Station, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('home', 'work', 'other')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- Saved Places Policies (Scoped strictly to user_id = auth.uid())
DROP POLICY IF EXISTS "Users can select own saved places" ON public.saved_places;
CREATE POLICY "Users can select own saved places"
  ON public.saved_places FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved places" ON public.saved_places;
CREATE POLICY "Users can insert own saved places"
  ON public.saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved places" ON public.saved_places;
CREATE POLICY "Users can update own saved places"
  ON public.saved_places FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved places" ON public.saved_places;
CREATE POLICY "Users can delete own saved places"
  ON public.saved_places FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Table: public.emergency_contacts
-- SOS & safety contacts for passenger rides
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can select own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Table: public.scheduled_rides
-- Rides booked in advance
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  pickup_name TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'toto',
  estimated_fare NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'dispatched', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.scheduled_rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own scheduled rides" ON public.scheduled_rides;
CREATE POLICY "Users can select own scheduled rides"
  ON public.scheduled_rides FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scheduled rides" ON public.scheduled_rides;
CREATE POLICY "Users can insert own scheduled rides"
  ON public.scheduled_rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scheduled rides" ON public.scheduled_rides;
CREATE POLICY "Users can update own scheduled rides"
  ON public.scheduled_rides FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Table: public.support_tickets
-- Help desk, dispute, & lost item tickets
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT,
  user_role TEXT DEFAULT 'user',
  ride_id TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  item_details TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own support tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Table: public.rides
-- Active bookings, trips, & completed ride history
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rides (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  driver_id TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  driver_photo TEXT,
  vehicle_number TEXT,
  vehicle_model TEXT,
  vehicle_type TEXT DEFAULT 'toto',
  pickup_name TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  distance_km NUMERIC(6, 2) DEFAULT 0,
  estimated_mins INTEGER DEFAULT 10,
  fare NUMERIC(10, 2) NOT NULL,
  driver_earnings NUMERIC(10, 2),
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'searching',
  otp TEXT,
  passenger_rating NUMERIC(3, 2),
  passenger_feedback TEXT,
  booked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rides" ON public.rides;
CREATE POLICY "Users can view own rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rides" ON public.rides;
CREATE POLICY "Users can insert own rides"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rides" ON public.rides;
CREATE POLICY "Users can update own rides"
  ON public.rides FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Table: public.driver_approvals
-- Driver partner onboarding registrations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.driver_approvals (
  id TEXT PRIMARY KEY,
  driver_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'toto',
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT,
  driver_photo TEXT,
  toto_photos TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_pin TEXT,
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.driver_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to submit driver registration" ON public.driver_approvals;
CREATE POLICY "Allow all users to submit driver registration"
  ON public.driver_approvals FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to view driver registrations" ON public.driver_approvals;
CREATE POLICY "Allow authenticated to view driver registrations"
  ON public.driver_approvals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated to update driver registrations" ON public.driver_approvals;
CREATE POLICY "Allow authenticated to update driver registrations"
  ON public.driver_approvals FOR UPDATE
  USING (true);

-- ==============================================================================
-- Table: public.drivers
-- Registered and active Toto Captains
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'toto',
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT DEFAULT 'Emerald Green',
  pin TEXT DEFAULT '1234',
  is_online BOOLEAN DEFAULT true,
  rating NUMERIC(3, 2) DEFAULT 4.95,
  battery_percentage INTEGER DEFAULT 85,
  total_trips INTEGER DEFAULT 0,
  today_earnings NUMERIC(10, 2) DEFAULT 0,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  heading DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active drivers" ON public.drivers;
CREATE POLICY "Public can view active drivers"
  ON public.drivers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow update driver location and status" ON public.drivers;
CREATE POLICY "Allow update driver location and status"
  ON public.drivers FOR UPDATE
  USING (true);

-- Seed initial online Toto captains
INSERT INTO public.drivers (id, name, phone, vehicle_type, vehicle_number, vehicle_model, vehicle_color, pin, is_online, rating, battery_percentage, total_trips, current_lat, current_lng)
VALUES 
  ('drv_1', 'Raju Karmakar', '+91 98745 22019', 'toto', 'WB-24-ER-2041', 'Mayuri Deluxe Li-ion E-Rickshaw', 'Emerald Green', '1234', true, 4.92, 88, 342, 22.5855, 88.4230),
  ('drv_2', 'Subhash Das', '+91 98302 44102', 'toto', 'WB-24-ER-5510', 'Saarthi Star E-Rickshaw', 'Canary Yellow', '1234', true, 4.88, 74, 512, 22.5892, 88.4285),
  ('drv_3', 'Amitava Mondal', '+91 97481 88320', 'toto', 'WB-24-ER-9932', 'City Life Li-ion Express', 'Electric Blue', '1234', true, 4.96, 92, 189, 22.5790, 88.4190)
ON CONFLICT (id) DO NOTHING;
