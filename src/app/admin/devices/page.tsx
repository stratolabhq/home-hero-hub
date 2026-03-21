'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  protocols: string[];
  ecosystems: Record<string, string>;
  home_assistant: string;
  image_url: string | null;
  requires_hub: string;
  hub_name: string | null;
  is_popular: boolean | null;
}

const EMPTY_FORM = {
  name: '',
  brand: '',
  category: '',
  protocols: [] as string[],
  ecosystems: { alexa: 'none', google_home: 'none', apple_homekit: 'none', smartthings: 'none', matter: 'none' } as Record<string, string>,
  home_assistant: 'none',
  image_url: '',
  requires_hub: 'false',
  hub_name: '',
};

const PROTOCOLS = ['WiFi', 'Zigbee', 'Z-Wave', 'Thread', 'Matter', 'Bluetooth'];
const ECOSYSTEMS = ['alexa', 'google_home', 'apple_homekit', 'smartthings', 'matter'];

export default function AdminDevicesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popularFilter, setPopularFilter] = useState<'all' | 'popular' | 'obscure'>('all');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return cats;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter !== 'all') list = list.filter(p => p.category === categoryFilter);
    if (popularFilter === 'popular') list = list.filter(p => p.is_popular === true);
    if (popularFilter === 'obscure') list = list.filter(p => !p.is_popular);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    return list;
  }, [products, search, categoryFilter, popularFilter]);

  const togglePopular = async (product: Product) => {
    const newVal = !product.is_popular;
    const { error: err } = await supabase
      .from('products')
      .update({ is_popular: newVal })
      .eq('id', product.id);
    if (!err) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_popular: newVal } : p));
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      protocols: product.protocols ?? [],
      ecosystems: { alexa: 'none', google_home: 'none', apple_homekit: 'none', smartthings: 'none', matter: 'none', ...product.ecosystems } as Record<string, string>,
      home_assistant: product.home_assistant ?? 'none',
      image_url: product.image_url ?? '',
      requires_hub: product.requires_hub ?? 'false',
      hub_name: product.hub_name ?? '',
    });
    setError(null);
  };

  const openAdd = () => {
    setShowAddModal(true);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const closeModal = () => {
    setEditingProduct(null);
    setShowAddModal(false);
    setError(null);
  };

  const toggleProtocol = (p: string) =>
    setForm(f => ({
      ...f,
      protocols: f.protocols.includes(p) ? f.protocols.filter(x => x !== p) : [...f.protocols, p],
    }));

  const toggleEcosystem = (eco: string) =>
    setForm(f => ({
      ...f,
      ecosystems: { ...f.ecosystems, [eco]: f.ecosystems[eco] === 'full' ? 'none' : 'full' },
    }));

  const saveProduct = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      protocols: form.protocols,
      ecosystems: form.ecosystems,
      home_assistant: form.home_assistant,
      image_url: form.image_url || null,
      requires_hub: form.requires_hub,
      hub_name: form.hub_name || null,
    };

    let err;
    if (editingProduct) {
      ({ error: err } = await supabase.from('products').update(payload).eq('id', editingProduct.id));
    } else {
      ({ error: err } = await supabase.from('products').insert([payload]));
    }

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    await fetchProducts();
    closeModal();
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    const { error: err } = await supabase.from('products').delete().eq('id', id);
    if (!err) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
    setDeleteConfirm(null);
  };

  const FormModal = ({ title }: { title: string }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Device Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Protocols</label>
            <div className="flex flex-wrap gap-2">
              {PROTOCOLS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProtocol(p)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.protocols.includes(p)
                      ? 'bg-[#2e6f40] text-white border-[#2e6f40]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ecosystems (full support)</label>
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEMS.map(eco => (
                <button
                  key={eco}
                  type="button"
                  onClick={() => toggleEcosystem(eco)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize transition-colors ${
                    form.ecosystems[eco] === 'full'
                      ? 'bg-[#3d8b54] text-white border-[#3d8b54]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                  }`}
                >
                  {eco.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Home Assistant Support</label>
            <div className="flex gap-3">
              {['none', 'partial', 'full'].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, home_assistant: level }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                    form.home_assistant === level
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-cyan-400'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Requires Hub?</label>
            <div className="flex gap-3 flex-wrap">
              {['false', 'true', 'thread_border_router'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, requires_hub: val }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.requires_hub === val
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                  }`}
                >
                  {val === 'false' ? 'No' : val === 'true' ? 'Yes' : 'Thread Border Router'}
                </button>
              ))}
            </div>
            {form.requires_hub === 'true' && (
              <input
                type="text"
                value={form.hub_name}
                onChange={e => setForm(f => ({ ...f, hub_name: e.target.value }))}
                placeholder="Hub name (e.g. Philips Hue Bridge)"
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button
            onClick={saveProduct}
            loading={saving}
            disabled={saving || !form.name || !form.brand || !form.category}
          >
            {editingProduct ? 'Save Changes' : 'Add Device'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Devices</h1>
            <p className="text-gray-500 text-sm">{products.length} devices in database</p>
          </div>
          <Button onClick={openAdd}>+ Add Device</Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search devices..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            >
              <option value="all">All ({products.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Curation:</label>
            <select
              value={popularFilter}
              onChange={e => setPopularFilter(e.target.value as 'all' | 'popular' | 'obscure')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            >
              <option value="all">All devices</option>
              <option value="popular">Popular only ({products.filter(p => p.is_popular).length})</option>
              <option value="obscure">Obscure only ({products.filter(p => !p.is_popular).length})</option>
            </select>
          </div>
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading devices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No devices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Device</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Brand</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Protocols</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Hub</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Popular</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(product => (
                    <tr key={product.id} className="hover:bg-[#f0f9f2] transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          {product.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image_url} alt="" className="w-8 h-8 rounded object-contain bg-gray-50 flex-shrink-0" />
                          )}
                          <span className="truncate" title={product.name}>{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.brand}</td>
                      <td className="px-4 py-3 text-gray-600">{product.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(product.protocols ?? []).slice(0, 3).map(p => (
                            <Badge key={p} variant="gray" size="sm">{p}</Badge>
                          ))}
                          {(product.protocols ?? []).length > 3 && (
                            <Badge variant="gray" size="sm">+{product.protocols.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {product.requires_hub === 'true' ? product.hub_name ?? 'Yes'
                          : product.requires_hub === 'thread_border_router' ? 'Thread BR'
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePopular(product)}
                          title={product.is_popular ? 'Mark as obscure' : 'Mark as popular'}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${product.is_popular ? 'bg-[#2e6f40]' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${product.is_popular ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(product)}
                            className="px-2.5 py-1 text-xs font-medium text-[#2e6f40] bg-[#f0f9f2] border border-[#d1ecd7] rounded hover:bg-[#d1ecd7] transition-colors"
                          >
                            Edit
                          </button>
                          {deleteConfirm === product.id ? (
                            <>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {(editingProduct || showAddModal) && (
        <FormModal title={editingProduct ? 'Edit Device' : 'Add New Device'} />
      )}
    </div>
  );
}
