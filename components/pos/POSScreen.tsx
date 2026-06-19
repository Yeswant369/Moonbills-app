'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Category, Product, CartItem, Settings, PaymentMethod, ReceiptData, PendingSale } from '@/lib/types';
import { generateBillNumber, round2 } from '@/lib/utils';
import { createSale } from '@/actions/sales';
import { queueSale, getPendingSales, removeSale } from '@/lib/offline-queue';
import { CategorySidebar } from './CategorySidebar';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { Receipt } from '@/components/receipt/Receipt';
import { Toast, ToastContainer } from '@/components/ui/Toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface Props {
  categories: Category[];
  products: Product[];
  settings: Settings;
}

export function POSScreen({ categories, products, settings }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const printTriggeredRef = useRef(false);

  // Load pending count on mount
  useEffect(() => {
    setPendingCount(getPendingSales().length);
  }, []);

  // Filter products by selected category (active only)
  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.category_id === selectedCategoryId && p.active)
    : products.filter((p) => p.active);

  // ── Toast helpers ──────────────────────────────────────────
  const showToast = useCallback((
    message: string,
    type: ToastItem['type'],
    opts?: { action?: ToastItem['action']; duration?: number }
  ) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, ...opts }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Cart operations ────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                line_total: round2((item.quantity + 1) * item.unit_price),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
          line_total: round2(product.price),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: item.quantity + delta,
                line_total: round2((item.quantity + delta) * item.unit_price),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  }, []);

  // ── Totals ─────────────────────────────────────────────────
  const subtotal = round2(cart.reduce((sum, item) => sum + item.line_total, 0));
  const gstAmount = round2((subtotal * settings.gst_percentage) / 100);
  const total = round2(subtotal + gstAmount);

  // ── Payment selection → generate receipt → print ──────────
  const handlePaymentSelect = useCallback(
    (method: PaymentMethod) => {
      if (cart.length === 0) return;
      const billNumber = generateBillNumber();
      const data: ReceiptData = {
        billNumber,
        items: [...cart], // snapshot
        subtotal,
        gstAmount,
        gstPercentage: settings.gst_percentage,
        total,
        paymentMethod: method,
        timestamp: new Date().toISOString(),
        restaurantName: settings.restaurant_name,
        gstNumber: settings.gst_number,
      };
      setShowPaymentModal(false);
      printTriggeredRef.current = false;
      setReceiptData(data);
    },
    [cart, subtotal, gstAmount, total, settings]
  );

  // ── Print + save effect ────────────────────────────────────
  useEffect(() => {
    if (!receiptData || printTriggeredRef.current) return;
    printTriggeredRef.current = true;

    const savedItems = receiptData.items;
    const savedMethod = receiptData.paymentMethod;
    const savedBillNumber = receiptData.billNumber;

    // Wait one tick for React to render the receipt DOM
    const printTimer = setTimeout(() => {
      window.print();

      // Fire-and-forget background save
      createSale(savedItems, savedMethod, settings, savedBillNumber)
        .then((result) => {
          if (!result.success) {
            const pending: PendingSale = {
              localId: crypto.randomUUID(),
              cart: savedItems,
              paymentMethod: savedMethod,
              settings,
              billNumber: savedBillNumber,
              timestamp: Date.now(),
            };
            queueSale(pending);
            setPendingCount(getPendingSales().length);
            showToast('Sale not synced — tap Retry to resend', 'error', { duration: 0 });
          }
        })
        .catch(() => {
          const pending: PendingSale = {
            localId: crypto.randomUUID(),
            cart: savedItems,
            paymentMethod: savedMethod,
            settings,
            billNumber: savedBillNumber,
            timestamp: Date.now(),
          };
          queueSale(pending);
          setPendingCount(getPendingSales().length);
          showToast('Offline — sale queued for sync', 'warning', { duration: 0 });
        });

      // Clear cart after print dialog opens
      setTimeout(() => {
        setCart([]);
        setReceiptData(null);
        printTriggeredRef.current = false;
      }, 500);
    }, 60);

    return () => clearTimeout(printTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptData]);

  // ── Retry pending sales ────────────────────────────────────
  const handleRetry = useCallback(async () => {
    const pending = getPendingSales();
    if (!pending.length || retrying) return;
    setRetrying(true);
    let successCount = 0;

    for (const sale of pending) {
      const result = await createSale(
        sale.cart,
        sale.paymentMethod,
        sale.settings,
        sale.billNumber
      );
      if (result.success) {
        removeSale(sale.localId);
        successCount++;
      }
    }

    const remaining = getPendingSales().length;
    setPendingCount(remaining);
    setRetrying(false);

    if (successCount > 0) {
      showToast(`${successCount} sale${successCount > 1 ? 's' : ''} synced!`, 'success');
    }
    if (remaining > 0) {
      showToast(`${remaining} sale${remaining > 1 ? 's' : ''} still pending`, 'error');
    }
  }, [retrying, showToast]);

  return (
    <>
      {/* ── Main POS Layout ─────────────────────────────────── */}
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Left: Categories */}
        <CategorySidebar
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        {/* Center: Products */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {settings.restaurant_name}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedCategoryId
                  ? categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Category'
                  : 'All Items'}{' '}
                · {filteredProducts.length} products
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  ⚠️ {retrying ? 'Retrying…' : `${pendingCount} unsynced`}
                </button>
              )}
              <Link
                href="/reports"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors"
              >
                ⚙ Settings
              </Link>
            </div>
          </header>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <ProductGrid products={filteredProducts} onAdd={addToCart} />
          </div>
        </main>

        {/* Right: Cart */}
        <CartPanel
          cart={cart}
          subtotal={subtotal}
          gstAmount={gstAmount}
          gstPercentage={settings.gst_percentage}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
          onPrint={() => cart.length > 0 && setShowPaymentModal(true)}
        />
      </div>

      {/* ── Payment Modal ───────────────────────────────────── */}
      {showPaymentModal && (
        <PaymentModal
          total={total}
          onSelect={handlePaymentSelect}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* ── Receipt (print-only) ────────────────────────────── */}
      <Receipt data={receiptData} printerWidth={settings.printer_width} />

      {/* ── Toasts ──────────────────────────────────────────── */}
      <ToastContainer>
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            action={t.action}
            onDismiss={dismissToast}
            duration={t.duration}
          />
        ))}
      </ToastContainer>
    </>
  );
}
