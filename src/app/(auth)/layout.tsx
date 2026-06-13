import Link from 'next/link';

/** Layout trang auth: card can giua man hinh. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-extrabold tracking-tight text-[var(--color-primary)]"
      >
        Mega<span className="text-[var(--color-text)]">Shop</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
