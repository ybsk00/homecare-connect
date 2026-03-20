import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@homecare/shared-types';
import type { SupabaseClient } from '@homecare/supabase-client';

export function createBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient;
}
