import type { Category, Product } from '@/lib/schemas';
import type { ListProductsParams } from './queries';

/**
 * Du lieu MOCK cho dev khi chua co Supabase project that.
 * Cho phep xem & cai thien UI/UX ngay ma khong can dung backend.
 * Khi `.env.local` co Supabase that -> query that se duoc dung thay the.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return /^https:\/\/.+\.supabase\.co/.test(url) && !url.includes('YOUR_PROJECT') && key.length > 20 && !key.includes('YOUR_');
}

export const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cà phê', slug: 'ca-phe' },
  { id: 'c2', name: 'Trà', slug: 'tra' },
  { id: 'c3', name: 'Phụ kiện', slug: 'phu-kien' },
];

const now = '2026-06-13T00:00:00Z';
export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Cà phê Arabica Cầu Đất 250g', slug: 'ca-phe-arabica-250g', description: 'Hạt rang vừa, hương hoa nhẹ, hậu ngọt.', price: 145000, stock: 40, image_url: null, category_id: 'c1', created_at: now },
  { id: 'p2', name: 'Cà phê Robusta Đắk Lắk 500g', slug: 'ca-phe-robusta-500g', description: 'Đậm, mạnh, phù hợp pha phin.', price: 165000, stock: 25, image_url: null, category_id: 'c1', created_at: now },
  { id: 'p3', name: 'Cà phê Blend Espresso 1kg', slug: 'ca-phe-blend-espresso-1kg', description: 'Tỉ lệ vàng cho máy espresso, crema dày.', price: 320000, stock: 12, image_url: null, category_id: 'c1', created_at: now },
  { id: 'p4', name: 'Trà ô long thượng hạng 100g', slug: 'tra-o-long-100g', description: 'Hậu ngọt, hương lan tự nhiên.', price: 210000, stock: 15, image_url: null, category_id: 'c2', created_at: now },
  { id: 'p5', name: 'Trà sen Tây Hồ 80g', slug: 'tra-sen-tay-ho', description: 'Ướp sen truyền thống, thanh tao.', price: 280000, stock: 0, image_url: null, category_id: 'c2', created_at: now },
  { id: 'p6', name: 'Phin pha cà phê inox 304', slug: 'phin-inox-304', description: 'Giữ nhiệt tốt, bền đẹp.', price: 89000, stock: 60, image_url: null, category_id: 'c3', created_at: now },
  { id: 'p7', name: 'Ly sứ thủ công 250ml', slug: 'ly-su-thu-cong', description: 'Men hỏa biến, mỗi chiếc một vẻ.', price: 120000, stock: 33, image_url: null, category_id: 'c3', created_at: now },
  { id: 'p8', name: 'Cân điện tử pha chế 0.1g', slug: 'can-dien-tu-pha-che', description: 'Độ chính xác cao cho barista.', price: 350000, stock: 8, image_url: null, category_id: 'c3', created_at: now },
];

/** Loc/sap xep mock trong bo nho - khop hanh vi cua listProducts. */
export function mockListProducts(params: ListProductsParams = {}): Product[] {
  const { search, categorySlug, sort = 'newest' } = params;
  let items = [...MOCK_PRODUCTS];

  if (categorySlug) {
    const cat = MOCK_CATEGORIES.find((c) => c.slug === categorySlug);
    if (!cat) return [];
    items = items.filter((p) => p.category_id === cat.id);
  }
  if (search && search.trim()) {
    const t = search.trim().toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(t));
  }
  switch (sort) {
    case 'price_asc': items.sort((a, b) => a.price - b.price); break;
    case 'price_desc': items.sort((a, b) => b.price - a.price); break;
    case 'name_asc': items.sort((a, b) => a.name.localeCompare(b.name, 'vi')); break;
    default: break; // newest: giu nguyen thu tu
  }
  return items;
}

export function mockProductBySlug(slug: string): Product | null {
  return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
}
