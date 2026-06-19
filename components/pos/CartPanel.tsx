'use client';

import { CartItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  cart: CartItem[];
  subtotal: number;
  gstAmount: number;
  gstPercentage: number;
  total: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPrint: () => void;
}

export function CartPanel({
  cart,
  subtotal,
  gstAmount,
  gstPercentage,
  total,
  onUpdateQuantity,
  onRemove,
  onClear,
  onPrint,
}: Props) {
  const isEmpty = cart.length === 0;

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-bold text-slate-900">
          Current Bill
          {cart.length > 0 && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          )}
        </h2>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors py-1 px-2 rounded-lg hover:bg-red-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-16">
            <div className="text-4xl">🧾</div>
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs">Tap a product to add it</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {cart.map((item) => (
              <div key={item.product_id} className="px-4 py-3">
                {/* Product name + delete */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">
                    {item.product_name}
                  </p>
                  <button
                    onClick={() => onRemove(item.product_id)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    aria-label={`Remove ${item.product_name}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Quantity + Price */}
                <div className="flex items-center justify-between">
                  {/* Qty controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors text-lg leading-none"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, 1)}
                      className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 active:bg-orange-300 flex items-center justify-center text-orange-700 font-bold transition-colors text-lg leading-none"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  {/* Line total */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(item.line_total)}
                    </p>
                    <p className="text-xs text-slate-400">
                      @ {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary + Actions */}
      <div className="border-t border-slate-200 flex-shrink-0">
        {/* Totals */}
        <div className="px-4 py-3 space-y-1.5 bg-slate-50">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>GST ({gstPercentage}%)</span>
            <span className="font-medium">{formatCurrency(gstAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>Grand Total</span>
            <span className="text-orange-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Print Button */}
        <div className="p-4">
          <button
            onClick={onPrint}
            disabled={isEmpty}
            className={`
              w-full h-13 rounded-xl text-base font-bold transition-all
              ${isEmpty
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md shadow-orange-200'
              }
            `}
          >
            {isEmpty ? 'Add items to bill' : '🖨 Print Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
