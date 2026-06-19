'use client';

import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  products: Product[];
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, onAdd }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-20">
        <div className="text-5xl">🛒</div>
        <p className="text-base font-medium">No products in this category</p>
        <p className="text-sm">Add products in Settings</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAdd(product)}
          className="
            group bg-white rounded-2xl p-4 text-left
            shadow-sm border border-slate-100
            hover:shadow-md hover:border-orange-200
            active:scale-95
            transition-all duration-150
            min-h-[100px] flex flex-col justify-between
          "
        >
          {/* Product Name */}
          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors">
            {product.name}
          </p>

          {/* Price */}
          <div className="mt-2">
            <span className="text-lg font-bold text-orange-600">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Tap indicator */}
          <div className="mt-2 text-xs text-slate-300 font-medium group-hover:text-orange-400 transition-colors">
            Tap to add
          </div>
        </button>
      ))}
    </div>
  );
}
