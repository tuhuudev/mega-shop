import Link from 'next/link';
import type { Route } from 'next';
import { Input } from '@/components/ui/input';
import { ProductGrid } from '@/components/product/product-grid';
import { listCategories, listProducts } from '@/lib/catalog/queries';
import type { ProductSort } from '@/lib/catalog/queries';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A→Z' },
];

const SORT_VALUES = new Set<ProductSort>(SORT_OPTIONS.map((o) => o.value));

type SearchParams = { search?: string; category?: string; sort?: string };

/** Xay query-string giu nguyen cac filter hien tai, ghi de mot so key. */
function buildHref(current: SearchParams, overrides: Partial<SearchParams>): Route {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (next.search) params.set('search', next.search);
  if (next.category) params.set('category', next.category);
  if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
  const qs = params.toString();
  return (qs ? `/?${qs}` : '/') as Route;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const search = sp.search?.trim() || undefined;
  const category = sp.category || undefined;
  const sort: ProductSort = SORT_VALUES.has(sp.sort as ProductSort)
    ? (sp.sort as ProductSort)
    : 'newest';

  const [products, categories] = await Promise.all([
    listProducts({ search, categorySlug: category, sort }),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent p-8 sm:p-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Mua sắm mọi thứ tại <span className="text-[var(--color-primary)]">Mega Shop</span>
        </h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Hàng nghìn sản phẩm chất lượng, giá tốt, giao nhanh. Thanh toán an toàn qua VNPay.
        </p>

        {/* Search box (GET form -> giu tren URL, SSR doc lai) */}
        <form action="/" method="get" className="mt-6 flex max-w-md gap-2">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
          <Input
            type="search"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Tìm sản phẩm…"
            aria-label="Tìm sản phẩm"
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-[var(--radius)] bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-primary-fg)] transition hover:brightness-95"
          >
            Tìm
          </button>
        </form>
      </section>

      {/* Category chips */}
      <section className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(sp, { category: undefined })}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition',
            !category
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
          )}
        >
          Tất cả
        </Link>
        {categories.map((c) => {
          const active = category === c.slug;
          return (
            <Link
              key={c.id}
              href={buildHref(sp, { category: c.slug })}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
              )}
            >
              {c.name}
            </Link>
          );
        })}
      </section>

      {/* Toolbar: ket qua + sort */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {search ? (
            <>
              Kết quả cho “<span className="font-semibold text-[var(--color-text)]">{search}</span>” ·{' '}
            </>
          ) : null}
          <span className="font-semibold text-[var(--color-text)]">{products.length}</span> sản phẩm
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildHref(sp, { sort: opt.value })}
                className={cn(
                  'rounded-[var(--radius)] px-3 py-1.5 text-sm transition',
                  active
                    ? 'bg-[var(--color-surface)] font-semibold text-[var(--color-text)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                )}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </section>

      <ProductGrid products={products} />
    </div>
  );
}
