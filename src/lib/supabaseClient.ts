import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable resolution with intelligent fallbacks
const rawSupabaseUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';

const rawSupabaseAnonKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

const isPlaceholder =
  !rawSupabaseUrl ||
  rawSupabaseUrl.includes('qjbbykgskirtoewkvgto') ||
  rawSupabaseUrl.includes('nmvenxrhqvukgtnmsbhu') ||
  rawSupabaseUrl.includes('placeholder') ||
  rawSupabaseUrl.includes('YOUR_') ||
  !rawSupabaseAnonKey ||
  rawSupabaseAnonKey.includes('placeholder') ||
  rawSupabaseAnonKey.includes('YOUR_');

export const isSupabaseConfigured: boolean = Boolean(
  !isPlaceholder &&
  rawSupabaseUrl.startsWith('https://') &&
  rawSupabaseAnonKey.length > 5
);

const supabaseUrl: string = isSupabaseConfigured ? rawSupabaseUrl : 'https://example.supabase.co';
const supabaseAnonKey: string = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder_key';

// Singleton Supabase Client Instance
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  }
  return supabaseClientInstance;
}

export const supabase: SupabaseClient = getSupabaseClient();

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
};

export default supabase;
