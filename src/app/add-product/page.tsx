'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: any;
  requires_hub: string;
  hub_name?: string;
  notes?: string;
}

export default function AddProduct() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [room, setRoom] = useState('');
  const [customName, setCustomName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAllDevices, setShowAllDevices] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      searchProducts(searchTerm.trim(), showAllDevices);
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, showAllDevices]);

  const searchProducts = async (term: string, showAll = false) => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%,notes.ilike.%${term}%`);

    if (!showAll) {
      query = query.eq('is_popular', true);
    }

    const { data, error } = await query.order('name').limit(100);

    if (error) {
      console.error('Error searching products:', error);
      setProducts([]);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) return;

    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      router.push('/login');
      return;
    }

    const { error: insertError } = await supabase
      .from('user_products')
      .insert({
        user_id: user.id,
        product_id: selectedProduct.id,
        room: room || null,
        custom_name: customName || null,
        purchase_date: purchaseDate || null,
        notes: notes || null,
      });

    setSubmitting(false);

    if (insertError) {
      if (insertError.message?.toLowerCase().includes('rls') ||
          insertError.message?.toLowerCase().includes('policy') ||
          insertError.code === '42501') {
        setError('Permission denied. Please sign out and sign back in, then try again.');
      } else {
        setError(insertError.message || 'Failed to add product. Please try again.');
      }
    } else {
      setShowSuccess(true);
      setSelectedProduct(null);
      setRoom('');
      setCustomName('');
      setPurchaseDate('');
      setNotes('');
      setSearchTerm('');
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-[#2e6f40] hover:text-[#1f4d2b] mb-4 flex items-center gap-2 text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Product to Inventory</h1>
          <p className="text-gray-600">
            Select a device from our database and add it to your smart home inventory
          </p>
        </div>

        {showSuccess && (
          <div className="bg-[#f0f9f2] border border-[#6fbf7d] rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#1f4d2b] font-medium">Product added successfully!</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Select Product</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Devices
              </label>
               <input
               type="text"
               placeholder="Search by name, brand, or model number..."
               value={searchTerm}
               onChange={(e) => {
  const value = (e.target as HTMLInputElement).value;
  setSearchTerm(value);
}}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllDevices(v => !v)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showAllDevices ? 'bg-[#2e6f40]' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showAllDevices ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-gray-500">
                  {showAllDevices ? 'All devices (including obscure)' : 'Popular devices only'}
                </span>
              </div>
            </div>

            {selectedProduct && (
              <div className="mb-4 p-4 bg-[#f0f9f2] border border-[#6fbf7d] rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">{selectedProduct.brand}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedProduct.protocols.map(protocol => (
                        <span key={protocol} className="px-2 py-0.5 bg-[#d1ecd7] text-[#1f4d2b] rounded text-xs font-medium">
                          {protocol}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Searching...</div>
              ) : searchTerm.trim().length < 2 ? (
                <div className="p-8 text-center text-gray-500">
                  Type at least 2 characters to search {showAllDevices ? '10,000+' : '~1,000 popular'} devices
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No devices found</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left p-4 hover:bg-[#f0f9f2] transition-colors ${
                        selectedProduct?.id === product.id ? 'bg-[#f0f9f2]' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.brand} • {product.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Add Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Location
                </label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a room...</option>
                  <option value="Living Room">Living Room</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bathroom">Bathroom</option>
                  <option value="Office">Office</option>
                  <option value="Garage">Garage</option>
                  <option value="Basement">Basement</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Hallway">Hallway</option>
                  <option value="Dining Room">Dining Room</option>
                  <option value="Guest Room">Guest Room</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Front Door Lock, Bedroom Lamp"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Give this device a friendly name to identify it easily
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date (Optional)
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any notes about setup, warranty, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!selectedProduct || submitting}
                  className="w-full px-6 py-3 bg-[#2e6f40] text-white rounded-xl hover:bg-[#3d8b54] disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                >
                  {submitting ? 'Adding...' : 'Add to My Inventory'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">💡 Pro Tip</h3>
              <p className="text-sm text-gray-600">
                Add custom names to easily identify multiple devices of the same type. 
                For example: "Kitchen Light", "Bedroom Light", instead of just "Philips Hue Bulb".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
