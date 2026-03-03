import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Always use the correct Supabase instance
const supabaseUrl = 'https://igvadjgjpyuvzailjqwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndmFkamdqcHl1dnphaWxqcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDI3MTAsImV4cCI6MjA4ODAxODcxMH0.eAqKCHDzrkvMTseaBP0I_JICP1owX60-cp3agYqRz4Q';

export const isSupabaseConfigured = (): boolean => true;

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
