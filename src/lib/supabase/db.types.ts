/**
 * Kieu Database tam thoi (viet tay) cho Supabase client typed.
 * Khi co Supabase project: chay `npm run db:types` de SINH LAI tu schema that.
 */
type Timestamptz = string;

interface Row<T> {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Row<{ id: string; full_name: string | null; role: 'customer' | 'staff' | 'admin'; created_at: Timestamptz }>;
      categories: Row<{ id: string; name: string; slug: string }>;
      products: Row<{
        id: string; name: string; slug: string; description: string | null;
        price: number; stock: number; image_url: string | null; category_id: string | null; created_at: Timestamptz;
      }>;
      carts: Row<{ id: string; user_id: string; created_at: Timestamptz }>;
      cart_items: Row<{ cart_id: string; product_id: string; quantity: number }>;
      orders: Row<{
        id: string; user_id: string; status: 'pending' | 'paid' | 'shipped' | 'cancelled';
        total_amount: number; recipient_name: string; phone: string; address: string; note: string | null; created_at: Timestamptz;
      }>;
      order_items: Row<{
        id: string; order_id: string; product_id: string | null; product_name: string;
        unit_price: number; quantity: number; line_total: number;
      }>;
      payments: Row<{
        id: string; order_id: string; provider: string; amount: number;
        status: 'pending' | 'success' | 'failed'; txn_ref: string; transaction_no: string | null;
        raw: unknown; created_at: Timestamptz;
      }>;
    };
    Functions: {
      place_order: {
        Args: { p_recipient: string; p_phone: string; p_address: string; p_note: string | null };
        Returns: string;
      };
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
