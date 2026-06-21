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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAdd(product)}
          className="
            group bg-white rounded-2xl p-4 text-left
            shadow-sm border border-slate-100
            hover:shadow-md hover:border-pink-200 hover:bg-pink-50/30
            active:scale-[0.97]
            transition-all duration-150
            min-h-[130px] flex flex-col justify-between
          "
        >
          {/* Product Name — spans are valid inside <button> */}
          <span className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-pink-700 transition-colors block">
            {product.name}
          </span>

          {/* Price + tap hint */}
          <span className="mt-3 flex items-end justify-between gap-1">
            <span className="text-xl font-bold text-pink-600 leading-none">
              {formatCurrency(product.price)}
            </span>
            <span className="text-[11px] text-slate-300 font-medium group-hover:text-pink-400 transition-colors leading-none pb-0.5">
              + Add
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
