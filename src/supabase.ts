import { createClient } from '@supabase/supabase-js';

import { env } from './env';

// Admin client — uses the service-role key, bypasses RLS. Server-only.
// Every route uses this to run the same queries / RPCs the Edge Functions did.
export const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
