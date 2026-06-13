import Link from 'next/link';
import type { Route } from 'next';
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
    <div className="flex flex-col gap-14">
      {/* Hero — toi gian, airy */}
      <section className="animate-rise mx-auto max-w-3xl pt-10 pb-2 text-center sm:pt-16">
        <span className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
          Cà phê · Trà · Phụ kiện
        </span>
        <h1 className="font-display mt-6 text-5xl leading-[1.08] text-[var(--color-text)] sm:text-7xl">
          Mua sắm, đơn giản.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--color-muted)]">
          Tuyển chọn kỹ, giao nhanh, thanh toán an toàn qua VNPay.
        </p>

        {/* Search box (GET form -> giu tren URL, SSR doc lai) — gach chan toi gian */}
        <form action="/" method="get" className="mx-auto mt-10 flex max-w-md items-center gap-3 border-b border-[var(--color-border-strong)] pb-2 focus-within:border-[var(--color-text)]">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
          <input
            type="search"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Tìm sản phẩm…"
            aria-label="Tìm sản phẩm"
            className="h-9 w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none"
          />
          <button
            type="submit"
            className="shrink-0 text-sm font-medium text-[var(--color-text)] transition-opacity hover:opacity-60"
          >
            Tìm →
          </button>
        </form>
      </section>

      {/* Category chips */}
      <section className="flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={buildHref(sp, { category: undefined })}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm transition',
            !category
              ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-primary-fg)]'
              : 'border-[var(--color-border-strong)] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]',
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
                'rounded-full border px-4 py-1.5 text-sm transition',
                active
                  ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-primary-fg)]'
                  : 'border-[var(--color-border-strong)] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]',
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
        <div className="flex flex-wrap items-center gap-4">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildHref(sp, { sort: opt.value })}
                className={cn(
                  'px-1 py-1 text-sm transition-colors',
                  active
                    ? 'font-medium text-[var(--color-text)] underline decoration-[var(--color-text)] underline-offset-[6px]'
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
