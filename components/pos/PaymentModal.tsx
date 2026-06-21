'use client';

import { PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  total: number;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}

const methods: { method: PaymentMethod; label: string; emoji: string; color: string; hover: string }[] = [
  { method: 'cash',  label: 'Cash',  emoji: '💵', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { method: 'upi',   label: 'UPI',   emoji: '📲', color: 'bg-blue-500',    hover: 'hover:bg-blue-600' },
  { method: 'card',  label: 'Card',  emoji: '💳', color: 'bg-violet-500',  hover: 'hover:bg-violet-600' },
];

export function PaymentModal({ total, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose Payment</h2>
          <p className="text-slate-500 text-sm">Amount Due</p>
          <p className="text-4xl font-black text-pink-600 mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        {/* Payment Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          {methods.map(({ method, label, emoji, color, hover }) => (
            <button
              key={method}
              onClick={() => onSelect(method)}
              className={`
                ${color} ${hover}
                w-full h-16 rounded-2xl text-white
                flex items-center justify-center gap-3
                text-xl font-bold
                shadow-md active:scale-95
                transition-all duration-150
              `}
            >
              <span className="text-2xl">{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl text-slate-500 hover:text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
