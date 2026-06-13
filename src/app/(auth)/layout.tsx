import Link from 'next/link';

/** Layout trang auth: card can giua man hinh. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-10 text-xl font-medium lowercase tracking-tight text-[var(--color-text)] transition-opacity hover:opacity-60"
      >
        megashop
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
