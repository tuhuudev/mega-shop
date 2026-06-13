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
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f5f5f4"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#a8a29e" text-anchor="middle" dominant-baseline="middle">Mega Shop</text></svg>`,
  );

export function ProductCard({ product }: { product: Product }) {
  const href = `/products/${product.slug}` as Route;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:shadow-lg hover:shadow-black/5">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-[var(--color-bg)]">
        <Image
          src={product.image_url ?? FALLBACK_IMG}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-105"
          // Anh fallback la data URI -> bo qua optimizer cho truong hop do.
          unoptimized={!product.image_url}
        />
        {outOfStock ? (
          <span className="absolute left-2 top-2 rounded-[var(--radius)] bg-[var(--color-danger)] px-2 py-1 text-xs font-semibold text-white">
            Hết hàng
          </span>
        ) : lowStock ? (
          <span className="absolute left-2 top-2 rounded-[var(--radius)] bg-[var(--color-success)] px-2 py-1 text-xs font-semibold text-white">
            Sắp hết
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={href}
          className="line-clamp-2 font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-lg font-extrabold text-[var(--color-primary)]">
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
