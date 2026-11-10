import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as clientFromConfig, formatSupabaseUrl } from '../supabaseClient.js';
import { 
  UserProfile, 
  DriverProfile, 
  DriverApprovalRequest, 
  ActiveRide, 
  TripRecord, 
  RideRequestDoc, 
  ChatMsg, 
  SavedPlaceItem, 
  EmergencyContact, 
  SupportTicket, 
  ScheduledRide 
} from '../types';

/**
 * Environment configuration for Supabase with graceful URL validation
 */
function initSupabase(): { client: SupabaseClient | null; isConfigured: boolean } {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as any);
  const rawUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
  const rawKey = (metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!rawUrl || !rawKey) {
    return { client: null, isConfigured: false };
  }

  // Reject placeholder values or unset templates
  if (
    rawUrl.includes('YOUR_') || 
    rawUrl.includes('your_') || 
    rawUrl.includes('placeholder') ||
    rawUrl.includes('nmvenxrhqvukgtnmsbhu') ||
    rawUrl.includes('qjbbykgskirtoewkvgto') ||
    rawUrl.startsWith('<') || 
    rawUrl === 'undefined' ||
    rawUrl === 'null' ||
    rawKey.includes('YOUR_')
  ) {
    return { client: null, isConfigured: false };
  }

  try {
    const formattedUrl = formatSupabaseUrl(rawUrl);
    const parsed = new URL(formattedUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { client: null, isConfigured: false };
    }
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { client: null, isConfigured: false };
    }

    const client = clientFromConfig || createClient(formattedUrl, rawKey);
    return { client, isConfigured: true };
  } catch (_err) {
    return { client: null, isConfigured: false };
  }
}

const { client: initializedClient, isConfigured } = initSupabase();

/**
 * Initialized Supabase client (active only when valid environment variables are supplied)
 */
export const supabase: SupabaseClient | null = isConfigured ? (initializedClient || clientFromConfig) : null;
export const isSupabaseConfigured: boolean = isConfigured;

/**
 * Storage keys for reactive local persistence before or alongside Supabase connection
 */
export type TableName = 
  | 'users'
  | 'drivers'
  | 'driver_approvals'
  | 'rides'
  | 'rideRequests'
  | 'trips'
  | 'earnings'
  | 'chat_messages'
  | 'admin_audit_logs'
  | 'saved_places'
  | 'emergency_contacts'
  | 'support_tickets'
  | 'scheduled_rides';

type TableListener<T = any> = (records: T[]) => void;
const listeners = new Map<TableName, Set<TableListener>>();
// High-performance in-memory cache to prevent repetitive JSON serialization/deserialization lag
const memoryCache = new Map<TableName, Record<string, any>>();

function getStorageKey(table: TableName): string {
  return `toto_${table}`;
}

function loadFromStorage<T = any>(table: TableName): Record<string, T> {
  if (memoryCache.has(table)) {
    return memoryCache.get(table) as Record<string, T>;
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(getStorageKey(table)) : null;
    if (!raw) {
      const initial: Record<string, T> = {};
      memoryCache.set(table, initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    memoryCache.set(table, parsed);
    return parsed;
  } catch (err) {
    console.warn(`Failed to read table ${table} from storage:`, err);
    const fallback: Record<string, T> = {};
    memoryCache.set(table, fallback);
    return fallback;
  }
}

function saveToStorage<T = any>(table: TableName, data: Record<string, T>): void {
  memoryCache.set(table, data);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(getStorageKey(table), JSON.stringify(data));
    }
  } catch (err) {
    console.warn(`Failed to write table ${table} to storage:`, err);
  }
}

function notifyListeners(table: TableName) {
  const set = listeners.get(table);
  if (!set || set.size === 0) return;
  const list = Object.values(loadFromStorage(table));
  set.forEach(fn => {
    try {
      fn(list);
    } catch (e) {
      console.warn(`Error in listener for ${table}:`, e);
    }
  });
}

/**
 * Clean data store providing immediate persistence and real-time pub/sub listeners,
 * matching relational table entities ready to sync with Supabase tables.
 */
export const appDb = {
  get<T = any>(table: TableName, id: string): T | null {
    const data = loadFromStorage<T>(table);
    return data[id] || null;
  },

  getAll<T = any>(table: TableName, filter?: (item: T) => boolean): T[] {
    const data = loadFromStorage<T>(table);
    const list = Object.values(data);
    return filter ? list.filter(filter) : list;
  },

  set<T extends { id?: string }>(table: TableName, id: string, item: T): void {
    const data = loadFromStorage<T>(table);
    data[id] = { ...item, id };
    saveToStorage(table, data);
    notifyListeners(table);

    // If Supabase is connected, sync asynchronously
    if (supabase && isSupabaseConfigured) {
      Promise.resolve(supabase.from(table).upsert({ ...(item as any), id })).catch(() => {});
    }
  },

  /**
   * High-performance batch upsert that writes once and notifies once
   */
  setBatch<T extends { id?: string }>(table: TableName, items: T[]): void {
    if (!items || items.length === 0) return;
    const data = loadFromStorage<T>(table);
    for (const item of items) {
      if (item && item.id) {
        data[item.id] = { ...item };
      }
    }
    saveToStorage(table, data);
    notifyListeners(table);
  },

  update<T = any>(table: TableName, id: string, updates: Partial<T>): T | null {
    const data = loadFromStorage<T>(table);
    if (!data[id]) {
      // Create if it doesn't exist
      data[id] = { id, ...updates } as T;
    } else {
      data[id] = { ...data[id], ...updates };
    }
    saveToStorage(table, data);
    notifyListeners(table);

    if (supabase && isSupabaseConfigured) {
      Promise.resolve(supabase.from(table).update(updates as any).eq('id', id)).catch(() => {});
    }
    return data[id];
  },

  delete(table: TableName, id: string): boolean {
    const data = loadFromStorage(table);
    if (data[id]) {
      delete data[id];
      saveToStorage(table, data);
      notifyListeners(table);

      if (supabase && isSupabaseConfigured) {
        Promise.resolve(supabase.from(table).delete().eq('id', id)).catch(() => {});
      }
      return true;
    }
    return false;
  },

  subscribe<T = any>(table: TableName, callback: TableListener<T>): () => void {
    if (!listeners.has(table)) {
      listeners.set(table, new Set());
    }
    listeners.get(table)!.add(callback);

    // Immediately invoke with current records
    const initial = Object.values(loadFromStorage<T>(table));
    try {
      callback(initial);
    } catch (e) {
      console.warn(`Initial callback error for ${table}:`, e);
    }

    return () => {
      listeners.get(table)?.delete(callback);
    };
  }
};

/**
 * Ready-to-use Supabase SQL Schema for database initialization
 */
export const SUPABASE_SQL_SCHEMA = `
-- Create Toto Drive tables for Supabase

create table if not exists users (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  rating numeric default 5.0,
  total_rides integer default 0,
  wallet_balance numeric default 0,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists drivers (
  id text primary key,
  name text not null,
  phone text not null,
  pin text not null,
  status text not null,
  vehicle_number text not null,
  vehicle_type text not null,
  rating numeric default 4.8,
  total_rides integer default 0,
  earnings numeric default 0,
  is_online boolean default false,
  is_verified boolean default false,
  current_location jsonb,
  created_at timestamptz default now()
);

create table if not exists driver_approvals (
  id text primary key,
  name text not null,
  phone text not null,
  vehicle_number text not null,
  vehicle_type text not null,
  status text not null default 'pending',
  applied_date text not null,
  experience text,
  license_photo text,
  aadhaar_photo text,
  vehicle_photo text
);

create table if not exists rides (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_phone text not null,
  driver_id text,
  driver_name text,
  status text not null,
  pickup jsonb not null,
  destination jsonb not null,
  fare numeric not null,
  otp text not null,
  created_at timestamptz default now()
);

create table if not exists trips (
  id text primary key,
  driver_id text not null,
  driver_name text,
  user_name text,
  fare numeric not null,
  pickup jsonb,
  destination jsonb,
  distance_km numeric,
  completed_at timestamptz default now()
);

create table if not exists chat_messages (
  id text primary key,
  ride_id text not null,
  sender_id text not null,
  sender_name text not null,
  sender_role text not null,
  text text not null,
  timestamp text not null,
  read boolean default false,
  created_at timestamptz default now()
);
`;
