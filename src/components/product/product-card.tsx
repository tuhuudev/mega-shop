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
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f1efe9"/><text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="17" letter-spacing="1" fill="#b3afa4" text-anchor="middle" dominant-baseline="middle">megashop</text></svg>`,
  );

export function ProductCard({ product }: { product: Product }) {
  const href = `/products/${product.slug}` as Route;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div className="group flex flex-col">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <Image
          src={product.image_url ?? FALLBACK_IMG}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          // Anh fallback la data URI -> bo qua optimizer cho truong hop do.
          unoptimized={!product.image_url}
        />
        {outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-muted)] ring-1 ring-[var(--color-border-strong)]">
            Hết hàng
          </span>
        ) : lowStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-accent)] ring-1 ring-[var(--color-border-strong)]">
            Sắp hết
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={href}
            className="line-clamp-2 text-sm leading-snug text-[var(--color-text)] transition-colors hover:text-[var(--color-muted)]"
          >
            {product.name}
          </Link>
          <span
            className={cn(
              'shrink-0 text-xs',
              outOfStock ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]',
            )}
          >
            {outOfStock ? 'Hết' : `Còn ${product.stock}`}
          </span>
        </div>

        <div className="mt-auto pt-1.5">
          <span className="text-base font-medium text-[var(--color-text)]">
            {formatVnd(product.price)}
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
