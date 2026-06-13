import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Middleware da chan, nhung kiem tra lai cho chac (type-narrowing).
  if (!user) redirect('/login?next=/account');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role ?? 'customer') as UserRole;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Tài khoản</h1>

      <Card className="mt-6 space-y-4">
        <Field label="Họ và tên" value={profile?.full_name ?? '—'} />
        <Field label="Email" value={user.email ?? '—'} />
        <Field label="Vai trò" value={ROLE_LABEL[role]} />
      </Card>

      <form action={signOut} className="mt-6">
        <Button type="submit" variant="danger" className="w-full">
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--color-text)]">{value}</span>
    </div>
  );
}
