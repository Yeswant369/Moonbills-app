import { NextRequest, NextResponse } from 'next/server';
import { createSale } from '@/actions/sales';
import { CartItem, PaymentMethod, Settings } from '@/lib/types';

/**
 * POST /api/sales/retry
 *
 * Accepts a pending sale payload and attempts to save it to Supabase.
 * Called from the client when retrying offline-queued sales.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      cart: CartItem[];
      paymentMethod: PaymentMethod;
      settings: Settings;
      billNumber: string;
    };

    const { cart, paymentMethod, settings, billNumber } = body;

    if (!cart?.length || !paymentMethod || !settings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createSale(cart, paymentMethod, settings, billNumber);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
