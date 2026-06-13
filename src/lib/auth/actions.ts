'use server';

import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Actions cho luong Auth (Supabase Auth).
 * Tra ve { error } khi that bai de form hien thi; redirect khi thanh cong.
 */

export type AuthState = { error: string } | undefined;

// Chi cho phep redirect noi bo (tranh open-redirect tu ?next=).
function safeNext(next: FormDataEntryValue | null): Route {
  const value = typeof next === 'string' ? next : '';
  return (value.startsWith('/') && !value.startsWith('//') ? value : '/account') as Route;
}

const signInSchema = z.object({
  email: z.string().email('Email khong hop le'),
  password: z.string().min(1, 'Nhap mat khau'),
});

const signUpSchema = z.object({
  full_name: z.string().min(2, 'Nhap ho ten'),
  email: z.string().email('Email khong hop le'),
  password: z.string().min(6, 'Mat khau toi thieu 6 ky tu'),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: 'Email hoac mat khau khong dung' };
  }

  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' };
  }

  const supabase = await createClient();
  // full_name -> options.data: trigger DB se dien vao bang profiles.
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name } },
  });
  if (error) {
    return { error: error.message };
  }

  redirect('/account');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
