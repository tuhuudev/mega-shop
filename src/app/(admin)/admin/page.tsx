import { Card } from '@/components/ui/card';
import { formatVnd } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

/** Dashboard admin: cac the KPI tong quan (so SP, so don, doanh thu 'paid', ton thap). */

const LOW_STOCK_THRESHOLD = 5;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [productCount, orderCount, paidOrders, lowStock] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount').eq('status', 'paid'),
    supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', LOW_STOCK_THRESHOLD),
  ]);

  // Doanh thu = tong total_amount cac don da thanh toan ('paid').
  const revenue = (paidOrders.data ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const kpis = [
    { label: 'Sản phẩm', value: String(productCount.count ?? 0) },
    { label: 'Đơn hàng', value: String(orderCount.count ?? 0) },
    { label: 'Doanh thu (đã thanh toán)', value: formatVnd(revenue) },
    { label: `Tồn thấp (≤ ${LOW_STOCK_THRESHOLD})`, value: String(lowStock.count ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Tổng quan</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Số liệu nhanh của cửa hàng.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-[var(--color-muted)]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{kpi.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
