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
    // Hidden on mobile — handled as horizontal tabs in POSScreen
    <aside className="hidden md:flex w-44 lg:w-52 flex-shrink-0 bg-slate-900 flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="text-white font-bold text-base tracking-wide">
          🧁 POS
        </div>
      </div>

      {/* Categories */}
      <nav className="app-scroll flex-1 overflow-y-auto py-3">
        {items.map((cat) => {
          const isActive = selectedId === cat.id;
          return (
            <button
              key={cat.id ?? 'all'}
              onClick={() => onSelect(cat.id)}
              className={`
                w-full text-left px-5 py-3.5 text-sm font-medium transition-all
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

      <div className="h-4" />
    </aside>
  );
}
