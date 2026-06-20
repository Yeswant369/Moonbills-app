'use client';

import { useState, useRef } from 'react';
import { Category } from '@/lib/types';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategory,
} from '@/actions/categories';

interface Props {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

export function CategoryManager({ categories, onCategoriesChange }: Props) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false); // synchronous guard against rapid taps
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    const result = await createCategory(name);
    if (result.success && result.data) {
      onCategoriesChange([...categories, result.data!]);
      setNewName('');
    }
    addingRef.current = false;
    setAdding(false);
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setLoading(id);
    const result = await updateCategory(id, { name });
    if (result.success) {
      onCategoriesChange(categories.map((c) => (c.id === id ? { ...c, name } : c)));
      setEditId(null);
    }
    setLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category? Products in it will be uncategorised.')) return;
    setLoading(id);
    const result = await deleteCategory(id);
    if (result.success) {
      onCategoriesChange(categories.filter((c) => c.id !== id));
    }
    setLoading(null);
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    setLoading(id);
    await reorderCategory(id, direction);
    // Re-sort locally after swap
    const result = await import('@/actions/categories').then((m) => m.getCategories());
    onCategoriesChange(result);
    setLoading(null);
  };

  return (
    <div className="space-y-3">
      {/* Add Category */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New category name…"
          className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-4 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {adding ? '…' : '+ Add'}
        </button>
      </div>

      {/* Category List */}
      {categories.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No categories yet. Add one above.</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(cat.id, 'up')}
                  disabled={index === 0 || loading === cat.id}
                  className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleReorder(cat.id, 'down')}
                  disabled={index === categories.length - 1 || loading === cat.id}
                  className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Name / Edit field */}
              {editId === cat.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(cat.id);
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  className="flex-1 h-9 px-2 rounded-lg border border-orange-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>
              )}

              {/* Actions */}
              <div className="flex gap-1">
                {editId === cat.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={loading === cat.id}
                      className="px-3 h-8 text-xs bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-3 h-8 text-xs bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(cat)}
                      className="px-3 h-8 text-xs bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={loading === cat.id}
                      className="px-3 h-8 text-xs bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                    >
                      {loading === cat.id ? '…' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
