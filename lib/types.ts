// ============================================================
// Cherrys Bakery POS — TypeScript Types
// ============================================================

export type PaymentMethod = 'cash' | 'upi' | 'card';
export type PrinterWidth = '58mm' | '80mm';

export interface Settings {
  id: string;
  restaurant_name: string;
  gst_number: string;
  gst_percentage: number;
  admin_pin: string;
  printer_width: PrinterWidth;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface ReceiptData {
  billNumber: string;
  items: CartItem[];
  subtotal: number;
  gstAmount: number;
  gstPercentage: number;
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: string; // ISO string
  restaurantName: string;
  gstNumber: string;
}

export interface Sale {
  id: string;
  bill_number: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
}

export interface PendingSale {
  localId: string;
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  settings: Settings;
  billNumber: string;
  timestamp: number;
}
