import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './db.types';

/** Supabase client phia SERVER (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Goi tu Server Component (read-only) -> bo qua; middleware da refresh session.
          }
        },
      },
    },
  );
}

/**
 * Client SERVICE ROLE (bypass RLS) - CHI dung o server cho tac vu he thong
 * (vd: webhook thanh toan cap nhat don). KHONG dung cho request cua nguoi dung thuong.
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
