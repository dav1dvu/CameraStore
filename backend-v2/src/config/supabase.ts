import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Supabase client using Service Role Key for Admin/Elevated operations (Bypasses RLS)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'oltp_store' },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Standard Supabase client for client-context proxying
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  db: { schema: 'oltp_store' }
});
