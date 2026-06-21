'use client';

import { useState } from 'react';
import { Category, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  deleteUncategorizedProducts,
  toggleProductActive,
} from '@/actions/products';

interface Props {
  products: Product[];
  categories: Category[];
  onProductsChange: (products: Product[]) => void;
}

interface ProductForm {
  name: string;
  price: string;
  category_id: string;
  active: boolean;
}

const emptyForm = (categories: Category[]): ProductForm => ({
  name: '',
  price: '',
  category_id: categories[0]?.id ?? '',
  active: true,
});

export function ProductManager({ products, categories, onProductsChange }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(emptyForm(categories));
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm(categories));
  const [loading, setLoading] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');

  const visibleProducts = filterCat === 'all'
    ? products
    : filterCat === 'uncategorized'
    ? products.filter((p) => !p.category_id)
    : products.filter((p) => p.category_id === filterCat);

  const getCatName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? '—';

  // ── Add product ──────────────────────────────────────────
  const handleAdd = async () => {
    const name = addForm.name.trim();
    const price = parseFloat(addForm.price);
    if (!name || isNaN(price) || price < 0) return;
    setLoading('add');
    const result = await createProduct({
      name,
      price,
      category_id: addForm.category_id || null,
      active: addForm.active,
    });
    if (result.success && result.data) {
      onProductsChange([...products, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
      setAddForm(emptyForm(categories));
      setShowAddForm(false);
    }
    setLoading(null);
  };

  // ── Edit product ─────────────────────────────────────────
  const startEdit = (p: Product) => {
    setEditId(p.id);
    setEditForm({
      name: p.name,
      price: String(p.price),
      category_id: p.category_id ?? '',
      active: p.active,
    });
  };

  const handleSaveEdit = async (id: string) => {
    const name = editForm.name.trim();
    const price = parseFloat(editForm.price);
    if (!name || isNaN(price) || price < 0) return;
    setLoading(id);
    const result = await updateProduct(id, {
      name,
      price,
      category_id: editForm.category_id || null,
      active: editForm.active,
    });
    if (result.success) {
      onProductsChange(
        products.map((p) =>
        p.id === id
          ? { ...p, name, price, category_id: editForm.category_id || null, active: editForm.active }
          : p
        )
      );
      setEditId(null);
    }
    setLoading(null);
  };

  // ── Toggle active ─────────────────────────────────────────
  const handleToggle = async (id: string, active: boolean) => {
    setLoading(id);
    const result = await toggleProductActive(id, active);
    if (result.success) {
      onProductsChange(products.map((p) => (p.id === id ? { ...p, active } : p)));
    }
    setLoading(null);
  };

  // ── Delete product ────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setLoading(id);
    const result = await deleteProduct(id);
    if (result.success) {
      onProductsChange(products.filter((p) => p.id !== id));
    }
    setLoading(null);
  };

  const handleDeleteUncategorized = async () => {
    const count = products.filter((p) => !p.category_id).length;
    if (count === 0) return;
    if (!window.confirm(`Delete all ${count} uncategorized product${count === 1 ? '' : 's'}?`)) return;

    setLoading('delete-uncategorized');
    const result = await deleteUncategorizedProducts();
    if (result.success) {
      onProductsChange(products.filter((p) => p.category_id));
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
        >
          <option value="all">All Categories</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{visibleProducts.length} products</span>
        {filterCat === 'uncategorized' && visibleProducts.length > 0 && (
          <button
            onClick={handleDeleteUncategorized}
            disabled={loading === 'delete-uncategorized'}
            className="px-3 h-9 bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400 font-semibold text-sm rounded-xl transition-colors"
          >
            {loading === 'delete-uncategorized' ? 'Deleting...' : 'Delete Uncategorized'}
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={() => {
              if (!showAddForm && !addForm.category_id && categories[0]) {
                setAddForm((form) => ({ ...form, category_id: categories[0].id }));
              }
              setShowAddForm((v) => !v);
            }}
            className="px-4 h-9 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Product'}
          </button>
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-pink-900">New Product</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <input
                autoFocus
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
placeholder="e.g. Chocolate Cake"
                 value={addForm.name}
                 onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                 placeholder="e.g. Chocolate Cake"
                 className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
               />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.5"
value={addForm.price}
                 onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                 placeholder="0.00"
                 className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
               />
            </div>
            <div>
<label className="text-xs text-slate-500 mb-1 block">Category</label>
               <select
                 value={addForm.category_id}
                 onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                 className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
               >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.active}
                  onChange={(e) => setAddForm((f) => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-pink-500"
                />
                <span className="text-sm text-slate-700">Active (visible in POS)</span>
              </label>
            </div>
          </div>
          <button
            onClick={handleAdd}
disabled={loading === 'add' || !addForm.name.trim() || !addForm.price}
             className="px-5 h-10 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-sm rounded-xl transition-colors"
           >
            {loading === 'add' ? 'Adding…' : 'Add Product'}
          </button>
        </div>
      )}

      {/* Product Table */}
      {visibleProducts.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No products found.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_130px_80px_140px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Name</span>
            <span>Price</span>
            <span>Category</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {visibleProducts.map((product) => (
              <div key={product.id} className="grid grid-cols-[1fr_100px_130px_80px_140px] gap-2 px-4 py-3 items-center hover:bg-slate-50">
                {editId === product.id ? (
                  // Edit row
                  <>
                    <input
autoFocus
                       type="text"
                       value={editForm.name}
                       onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                       className="h-9 px-2 rounded-lg border border-pink-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
value={editForm.price}
                       onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                       className="h-9 px-2 rounded-lg border border-pink-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    <select
                      value={editForm.category_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="h-9 px-2 rounded-lg border border-pink-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                    >
                      <option value="">Uncategorised</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
type="checkbox"
checked={editForm.active}
                         onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                         className="w-4 h-4 rounded accent-pink-500"
                       />
                      <span className="text-xs">{editForm.active ? 'Active' : 'Hidden'}</span>
                    </label>
                    <div className="flex gap-1 justify-end">
                      <button
onClick={() => handleSaveEdit(product.id)}
                         disabled={loading === product.id}
                         className="px-3 h-8 text-xs bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 h-8 text-xs bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  // View row
                  <>
                    <span className="text-sm font-medium text-slate-800 truncate">{product.name}</span>
                    <span className="text-sm font-bold text-pink-600">{formatCurrency(product.price)}</span>
                    <span className="text-xs text-slate-500 truncate">{getCatName(product.category_id)}</span>
                    <button
                      onClick={() => handleToggle(product.id, !product.active)}
                      disabled={loading === product.id}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                        product.active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {product.active ? '● Active' : '○ Hidden'}
                    </button>
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => startEdit(product)}
                        className="px-3 h-8 text-xs bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={loading === product.id}
                        className="px-3 h-8 text-xs bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                      >
                        {loading === product.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
