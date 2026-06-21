'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Category, Product, CartItem, Settings, PaymentMethod, ReceiptData, PendingSale } from '@/lib/types';
import { generateBillNumber, round2, formatCurrency } from '@/lib/utils';
import { createSale } from '@/actions/sales';
import { getCategories } from '@/actions/categories';
import { getProducts } from '@/actions/products';
import { getSettings } from '@/actions/settings';
import { queueSale, getPendingSales, removeSale } from '@/lib/offline-queue';
import { printBill } from '@/lib/printer';
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
  const [liveCategories, setLiveCategories] = useState(categories);
  const [liveProducts, setLiveProducts] = useState(products);
  const [liveSettings, setLiveSettings] = useState(settings);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const printTriggeredRef = useRef(false);

  // Load pending count on mount
  useEffect(() => {
    queueMicrotask(() => setPendingCount(getPendingSales().length));
  }, []);

  const refreshData = useCallback(async () => {
    const [nextCategories, nextProducts, nextSettings] = await Promise.all([
      getCategories(),
      getProducts(),
      getSettings(),
    ]);

    setLiveCategories(nextCategories);
    setLiveProducts(nextProducts);
    setLiveSettings(nextSettings);
    setSelectedCategoryId((current) =>
      current && !nextCategories.some((category) => category.id === current)
        ? null
        : current
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshData();
    });

    const handleFocus = () => void refreshData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshData]);

  // Filter products by selected category (active only)
  const filteredProducts = selectedCategoryId
    ? liveProducts.filter((p) => p.category_id === selectedCategoryId && p.active)
    : liveProducts.filter((p) => p.active);

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
  const gstAmount = round2((subtotal * liveSettings.gst_percentage) / 100);
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
        gstPercentage: liveSettings.gst_percentage,
        total,
        paymentMethod: method,
        timestamp: new Date().toISOString(),
        restaurantName: "Toasted Tales",
        gstNumber: liveSettings.gst_number,
      };
      setShowPaymentModal(false);
      printTriggeredRef.current = false;
      setReceiptData(data);
    },
    [cart, subtotal, gstAmount, total, liveSettings]
  );

  // ── Print + save effect ────────────────────────────────────
  useEffect(() => {
    if (!receiptData || printTriggeredRef.current) return;
    printTriggeredRef.current = true;

    const savedData       = receiptData;       // stable snapshot
    const savedItems      = receiptData.items;
    const savedMethod     = receiptData.paymentMethod;
    const savedBillNumber = receiptData.billNumber;

    // Wait one tick for React to render the receipt DOM (needed for window.print() fallback)
    const printTimer = setTimeout(async () => {
      // ── PRINT (TCP / AirPrint / browser fallback) ──────────
      try {
        await printBill(savedData);
      } catch {
        // printBill already shows an alert; continue with Supabase save regardless
      }

      // ── SAVE to Supabase (fire-and-forget, unchanged) ───────
      createSale(savedItems, savedMethod, liveSettings, savedBillNumber)
        .then((result) => {
          if (!result.success) {
            const pending: PendingSale = {
              localId: crypto.randomUUID(),
              cart: savedItems,
              paymentMethod: savedMethod,
              settings: liveSettings,
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
            settings: liveSettings,
            billNumber: savedBillNumber,
            timestamp: Date.now(),
          };
          queueSale(pending);
          setPendingCount(getPendingSales().length);
          showToast('Offline — sale queued for sync', 'warning', { duration: 0 });
        });

      // Clear cart after print
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

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  // Close cart drawer after printing
  const handlePrint = () => {
    if (cart.length > 0) {
      setShowPaymentModal(true);
      setCartOpen(false);
    }
  };

  return (
    <>
      {/* ── Main POS Layout ─────────────────────────────────── */}
      <div className="safe-screen flex min-h-0 bg-slate-50 overflow-hidden">

        {/* Left: Categories — vertical sidebar, hidden on mobile */}
        <CategorySidebar
          categories={liveCategories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        {/* Center: Products */}
        <main className="flex-1 flex min-h-0 flex-col overflow-hidden min-w-0">

          {/* ── Top bar ─────────────────────────────────────── */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            {/* Mobile brand (hidden when sidebar is visible) */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                       {/* 1. NEW MOBILE LOGO: Only visible on smaller screens (md:hidden) */}
          <div className="flex items-center gap-2 md:hidden shrink-0 pr-3 border-r border-slate-200">
            <img 
              src="/logo.png" 
              alt="Toasted Tales" 
              className="w-15 h-15 md:w-12 md:h-12 rounded-full bg-slate-100 object-cover" 
            />
            <span className="font-bold text-slate-900 text-lg md:text-xl whitespace-nowrap">
              Toasted Tales
            </span>
          </div>

          {/* 2. EXISTING MENU TEXT */}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              menu
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
              {selectedCategoryId
                ? liveCategories.find((c) => c.id === selectedCategoryId)?.name ?? 'Category'
                : 'All Items'}{' '}
              · {filteredProducts.length} products
            </p>
          </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {pendingCount > 0 && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  ⚠️ {retrying ? 'Retrying…' : `${pendingCount} pending`}
                </button>
              )}
              <Link
                href="/reports"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors hidden sm:block"
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

          {/* ── Mobile horizontal category tabs (md+ uses sidebar) ── */}
          <div className="md:hidden flex gap-2 px-4 py-2.5 bg-slate-900 overflow-x-auto flex-shrink-0 scrollbar-none">
            {[{ id: null, name: 'All Items' }, ...liveCategories].map((cat) => (
              <button
                key={cat.id ?? 'all'}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                  transition-all whitespace-nowrap
                  ${selectedCategoryId === cat.id
? 'bg-pink-500 text-white'
                   : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* ── Product Grid ─────────────────────────────────── */}
          <div className="app-scroll flex-1 min-h-0 overflow-y-auto">
            <ProductGrid products={filteredProducts} onAdd={addToCart} />
          </div>

          {/* ── Floating View Bill FAB (mobile/tablet, lg+ hidden) ── */}
          <div
            className={`
              lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30
              transition-all duration-300
              ${totalQty > 0 && !cartOpen
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4 pointer-events-none'
              }
            `}
          >
            <button
              onClick={() => setCartOpen(true)}
              className="
                flex items-center gap-3 px-6 py-3.5
                bg-pink-500 hover:bg-pink-600 active:bg-pink-700
                text-white font-bold text-sm rounded-2xl
                 shadow-lg shadow-pink-500/40
                transition-colors
              "
            >
              <span className="relative">
                🧾
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-pink-600 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {totalQty}
                </span>
              </span>
              <span>View Bill · {formatCurrency(total)}</span>
            </button>
          </div>

        </main>

        {/* ── Desktop cart: always-visible sidebar (lg+) ──────── */}
        {/*    hidden on mobile/tablet so it doesn't affect layout */}
        <aside className="hidden lg:flex lg:w-80 lg:flex-shrink-0 border-l border-slate-200">
          <CartPanel
            cart={cart}
            subtotal={subtotal}
            gstAmount={gstAmount}
            gstPercentage={liveSettings.gst_percentage}
            total={total}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClear={() => setCart([])}
            onPrint={handlePrint}
            showClose={false}
          />
        </aside>

      </div>{/* end safe-screen flex */}

      {/* ── Mobile/tablet cart drawer (hidden on lg+) ───────── */}
      {/* Backdrop */}
      <div
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
        className={`
          lg:hidden fixed inset-0 z-40 bg-black/50
          transition-opacity duration-300
          ${cartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      />
      {/* Drawer panel — slides in from right */}
      <div
        className={`
          lg:hidden fixed inset-y-0 right-0 z-50
          w-full sm:w-96
          shadow-2xl border-l border-slate-200
          transition-transform duration-300 ease-in-out
          ${cartOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <CartPanel
          cart={cart}
          subtotal={subtotal}
          gstAmount={gstAmount}
          gstPercentage={liveSettings.gst_percentage}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
          onPrint={handlePrint}
          showClose
          onClose={() => setCartOpen(false)}
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

      {/* ── Receipt (print-only, used for browser window.print() fallback) ── */}
      <Receipt data={receiptData} printerWidth={liveSettings.printer_width} />

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
