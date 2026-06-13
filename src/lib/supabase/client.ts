import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './db.types';

/** Supabase client phia TRINH DUYET (client components). Dung anon key + RLS. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
