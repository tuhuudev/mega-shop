import { ProductCard } from './product-card';
import type { Product } from '@/lib/schemas';

/** Luoi SP responsive. Hien thong bao rong khi khong co ket qua. */
export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] py-24 text-center">
        <p className="font-display text-2xl text-[var(--color-text)]">Không tìm thấy sản phẩm</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Thử đổi từ khóa hoặc bộ lọc khác.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
