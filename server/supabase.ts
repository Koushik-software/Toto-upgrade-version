import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rawUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();

const rawKey = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

const isPlaceholder =
  !rawUrl ||
  rawUrl.includes('qjbbykgskirtoewkvgto') ||
  rawUrl.includes('nmvenxrhqvukgtnmsbhu') ||
  rawUrl.includes('placeholder') ||
  rawUrl.includes('YOUR_');

export const isServerSupabaseConfigured = !isPlaceholder && rawUrl.startsWith('http') && Boolean(rawKey);

export const serverSupabase = isServerSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const supabaseServerConfig = {
  url: isServerSupabaseConfigured ? rawUrl : '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  jwksUrl: isServerSupabaseConfigured ? `${rawUrl}/auth/v1/.well-known/jwks.json` : '',
  hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
  isConfigured: isServerSupabaseConfigured,
};

export default serverSupabase;
