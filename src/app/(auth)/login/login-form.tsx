'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { signIn, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

  return (
    <Card>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Đăng nhập</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Chào mừng quay lại Mega Shop.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[var(--color-text)]">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="ban@email.com" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[var(--color-text)]">Mật khẩu</label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {state?.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Đang xử lý...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        Chưa có tài khoản?{' '}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Đăng ký
        </Link>
      </p>
    </Card>
  );
}
