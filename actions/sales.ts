'use server';

import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { CartItem, PaymentMethod, Settings, SaleWithItems } from '@/lib/types';
import { generateBillNumber, round2 } from '@/lib/utils';

export async function createSale(
  cart: CartItem[],
  paymentMethod: PaymentMethod,
  settings: Settings,
  billNumber?: string
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    const supabase = createServerClient();

    const subtotal = round2(cart.reduce((sum, item) => sum + item.line_total, 0));
    const gstAmount = round2((subtotal * settings.gst_percentage) / 100);
    const totalAmount = round2(subtotal + gstAmount);
    const finalBillNumber = billNumber ?? generateBillNumber();

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        bill_number: finalBillNumber,
        subtotal,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (saleError) throw new Error(saleError.message);

    const items = cart.map((item) => ({
      sale_id: sale.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(items);
    if (itemsError) throw new Error(itemsError.message);

    // Invalidate reports cache so the new sale shows up immediately
    revalidatePath('/reports');

    return { success: true, saleId: sale.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** Fetch all sales for a given YYYY-MM-DD date — always fresh, never cached */
export async function getDailySales(date: string): Promise<SaleWithItems[]> {
  // Opt out of Next.js data cache so reports always show the latest data
  noStore();
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false });
    return (data as SaleWithItems[]) ?? [];
  } catch {
    return [];
  }
}

/** Fetch all sales for a given year + month (1-indexed) — always fresh, never cached */
export async function getMonthlySales(
  year: number,
  month: number
): Promise<SaleWithItems[]> {
  noStore();
  try {
    const supabase = createServerClient();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false });
    return (data as SaleWithItems[]) ?? [];
  } catch {
    return [];
  }
}
