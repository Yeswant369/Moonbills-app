'use client';

import { Category } from '@/lib/types';

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: Props) {
  const items = [{ id: null, name: 'All Items' }, ...categories];

  return (
    <aside className="w-44 flex-shrink-0 bg-slate-900 flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="text-white font-bold text-sm tracking-wider">
          🧁 POS
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((cat) => {
          const isActive = selectedId === cat.id;
          return (
            <button
              key={cat.id ?? 'all'}
              onClick={() => onSelect(cat.id)}
              className={`
                w-full text-left px-4 py-3 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              {cat.name}
            </button>
          );
        })}
      </nav>

      {/* Footer spacer */}
      <div className="h-4" />
    </aside>
  );
}
