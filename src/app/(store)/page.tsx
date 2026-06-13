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
    <div className="flex flex-col gap-10">
      {/* Hero — editorial, am ap */}
      <section className="animate-rise relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-ink)] px-7 py-12 text-[var(--color-ink-fg)] sm:px-12 sm:py-16">
        {/* Quang sang am + vong tron trang tri */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--color-primary)] opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[var(--color-accent)] opacity-20 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-fg)]/20 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-ink-fg)]/70">
            Rang xay mỗi ngày
          </span>
          <h1 className="mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
            Hương vị thật,
            <br />
            <span className="italic text-[var(--color-primary)]">pha cho ngày của bạn.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-ink-fg)]/75 sm:text-lg">
            Cà phê, trà và phụ kiện pha chế tuyển chọn. Giao nhanh, thanh toán an toàn qua VNPay.
          </p>

          {/* Search box (GET form -> giu tren URL, SSR doc lai) */}
          <form action="/" method="get" className="mt-8 flex max-w-md gap-2.5">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
            <input
              type="search"
              name="search"
              defaultValue={search ?? ''}
              placeholder="Tìm cà phê, trà, phụ kiện…"
              aria-label="Tìm sản phẩm"
              className="h-12 w-full rounded-full border border-[var(--color-ink-fg)]/15 bg-[var(--color-ink-fg)]/8 px-5 text-[var(--color-ink-fg)] placeholder:text-[var(--color-ink-fg)]/45 outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-ink-fg)]/12"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-[var(--color-primary)] px-7 font-semibold text-[var(--color-primary-fg)] transition hover:-translate-y-0.5"
            >
              Tìm
            </button>
          </form>
        </div>
      </section>

      {/* Category chips */}
      <section className="flex flex-wrap items-center gap-2.5">
        <Link
          href={buildHref(sp, { category: undefined })}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition',
            !category
              ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-ink-fg)] shadow-[var(--shadow-soft)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
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
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                active
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-ink-fg)] shadow-[var(--shadow-soft)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
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
                  'rounded-full px-3.5 py-1.5 text-sm transition',
                  active
                    ? 'bg-[var(--color-primary)]/12 font-semibold text-[var(--color-primary)]'
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
