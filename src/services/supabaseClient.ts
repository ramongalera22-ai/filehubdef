import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════
// Supabase Client
// ═══════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ztigttazrdzkpxrzyast.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20);
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-key-configure-in-env',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
