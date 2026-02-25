import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded credentials — env vars only override if they look valid
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FALLBACK_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const supabaseUrl = (envUrl && envUrl.startsWith('https://') && envUrl.includes('supabase')) ? envUrl : FALLBACK_URL;
const supabaseAnonKey = (envKey && envKey.startsWith('eyJ') && envKey.length > 100) ? envKey : FALLBACK_KEY;

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'));
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
