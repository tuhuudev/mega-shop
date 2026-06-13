import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { formatVnd } from '@/lib/schemas';
import { getProductBySlug } from '@/lib/catalog/queries';
import { ProductPurchase } from '@/components/product/product-purchase';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f5f5f4"/><text x="50%" y="50%" font-family="sans-serif" font-size="36" fill="#a8a29e" text-anchor="middle" dominant-baseline="middle">Mega Shop</text></svg>`,
  );

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Không tìm thấy sản phẩm · Mega Shop' };

  const description = product.description?.slice(0, 160) ?? `Mua ${product.name} tại Mega Shop.`;
  return {
    title: `${product.name} · Mega Shop`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-[var(--color-muted)]">
        <Link href="/" className="hover:text-[var(--color-text)]">
          Sản phẩm
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-text)]">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Anh */}
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Image
            src={product.image_url ?? FALLBACK_IMG}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
            unoptimized={!product.image_url}
          />
        </div>

        {/* Thong tin + mua */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
            <p className="mt-3 text-3xl font-extrabold text-[var(--color-primary)]">
              {formatVnd(product.price)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 font-medium',
                outOfStock
                  ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                  : 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
              )}
            >
              {outOfStock ? 'Hết hàng' : lowStock ? `Sắp hết · còn ${product.stock}` : `Còn ${product.stock} sản phẩm`}
            </span>
          </div>

          {product.description ? (
            <div className="whitespace-pre-line leading-relaxed text-[var(--color-muted)]">
              {product.description}
            </div>
          ) : (
            <p className="text-[var(--color-muted)]">Chưa có mô tả cho sản phẩm này.</p>
          )}

          <div className="mt-2">
            <ProductPurchase productId={product.id} stock={product.stock} />
          </div>
        </div>
      </div>
    </div>
  );
}
