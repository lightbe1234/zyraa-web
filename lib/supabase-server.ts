import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error('Supabase server environment is not configured.');
  }
  adminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}
