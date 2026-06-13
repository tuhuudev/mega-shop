import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { formatVnd } from '@/lib/schemas';
import type { Product } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { AddToCartButton } from './add-to-cart-button';

/** Anh fallback khi SP chua co image_url (inline SVG -> khong phu thuoc asset/domain). */
const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#efe4d2"/><circle cx="200" cy="180" r="64" fill="none" stroke="#bd4626" stroke-width="3" opacity="0.5"/><path d="M200 132 q22 48 0 96 q-22 -48 0 -96Z" fill="#bd4626" opacity="0.45"/><text x="50%" y="300" font-family="Georgia, serif" font-style="italic" font-size="26" fill="#8c7c66" text-anchor="middle">Megashop</text></svg>`,
  );

export function ProductCard({ product }: { product: Product }) {
  const href = `/products/${product.slug}` as Route;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-[var(--color-bg)]">
        <Image
          src={product.image_url ?? FALLBACK_IMG}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.06]"
          // Anh fallback la data URI -> bo qua optimizer cho truong hop do.
          unoptimized={!product.image_url}
        />
        {outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-ink)]/85 px-2.5 py-1 text-xs font-semibold text-[var(--color-ink-fg)] backdrop-blur">
            Hết hàng
          </span>
        ) : lowStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-fg)]">
            Sắp hết
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={href}
          className="line-clamp-2 font-medium leading-snug text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span className="font-display text-xl font-semibold text-[var(--color-text)]">
            {formatVnd(product.price)}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              outOfStock ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]',
            )}
          >
            {outOfStock ? 'Hết hàng' : `Còn ${product.stock}`}
          </span>
        </div>

        <AddToCartButton
          productId={product.id}
          disabled={outOfStock}
          size="sm"
          className="mt-1 w-full"
          label={outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        />
      </div>
    </div>
  );
}
