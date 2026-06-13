'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { signUp, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, undefined);

  return (
    <Card>
      <h1 className="text-xl font-medium tracking-tight text-[var(--color-text)]">Tạo tài khoản</h1>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">Đăng ký để mua sắm tại megashop.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium text-[var(--color-text)]">Họ và tên</label>
          <Input id="full_name" name="full_name" type="text" autoComplete="name" required placeholder="Nguyễn Văn A" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[var(--color-text)]">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="ban@email.com" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[var(--color-text)]">Mật khẩu</label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
          <p className="text-xs text-[var(--color-muted)]">Tối thiểu 6 ký tự.</p>
        </div>

        {state?.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Đang xử lý...' : 'Đăng ký'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        Đã có tài khoản?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-[var(--color-text)] underline underline-offset-4 hover:opacity-60"
        >
          Đăng nhập
        </Link>
      </p>
    </Card>
  );
}
