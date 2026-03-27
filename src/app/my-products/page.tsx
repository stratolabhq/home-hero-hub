'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AffiliateDisclosure from '@/components/AffiliateDisclosure';
import { generateAmazonLink, trackAmazonClick } from '@/lib/amazon-affiliate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProduct {
  id: string;
  room: string;
  custom_name: string;
  purchase_date: string;
  notes: string;
  quantity: number;
  created_at: string;
  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    protocols: string[];
    ecosystems: any;
    requires_hub: string;
    hub_name: string;
    notes: string;
  };
}

function getEcosystemBadgeVariant(level?: string): 'green' | 'amber' | 'gray' {
  if (level === 'full') return 'green';
  if (level === 'partial') return 'amber';
  return 'gray';
}

export default function MyProducts() {
  const router = useRouter();
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'room' | 'category'>('room');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ room: '', custom_name: '', purchase_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserProducts();
  }, []);

  const fetchUserProducts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('user_products')
      .select('*, products (*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user products:', error);
    } else {
      setUserProducts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product from your inventory?')) return;
    setDeleting(id);
    const { error } = await supabase.from('user_products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      alert('Error removing product');
    } else {
      setUserProducts(userProducts.filter(p => p.id !== id));
    }
    setDeleting(null);
  };

  const startEdit = (product: UserProduct) => {
    setEditingId(product.id);
    setEditForm({
      room: product.room || '',
      custom_name: product.custom_name || '',
      purchase_date: product.purchase_date || '',
      notes: product.notes || '',
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('user_products')
      .update({
        room: editForm.room || null,
        custom_name: editForm.custom_name || null,
        purchase_date: editForm.purchase_date || null,
        notes: editForm.notes || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      alert('Error saving changes');
    } else {
      setUserProducts(userProducts.map(p => p.id === id ? { ...p, ...editForm } : p));
      setEditingId(null);
    }
    setSaving(false);
  };

  const groupedProducts = userProducts.reduce((acc, product) => {
    const key = groupBy === 'room'
      ? product.room || 'Unassigned'
      : product.products.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {} as Record<string, UserProduct[]>);

  const totalProducts = userProducts.length;
  const roomsUsed = new Set(userProducts.filter(p => p.room).map(p => p.room)).size;
  const categoriesOwned = new Set(userProducts.map(p => p.products.category)).size;
  const matterDevices = userProducts.filter(p => p.products.ecosystems?.matter === 'full').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Products</h1>
              <p className="text-gray-600">Manage your smart home device inventory</p>
            </div>
            <Button onClick={() => router.push('/add-product')} size="lg">
              + Add Product
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard label="Total Products"  value={totalProducts}    valueColor="#2e6f40" />
          <StatsCard label="Rooms"           value={roomsUsed}        valueColor="#3d8b54" />
          <StatsCard label="Categories"      value={categoriesOwned}  valueColor="#9333ea" />
          <StatsCard label="Matter Devices"  value={matterDevices}    valueColor="#8B5CF6" />
        </div>

        {/* Group toggle */}
        <Card padding="sm" className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <button
              onClick={() => setGroupBy('room')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'room'
                  ? 'bg-[#2e6f40] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40]'
              }`}
            >
              Room
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'category'
                  ? 'bg-[#2e6f40] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40]'
              }`}
            >
              Category
            </button>
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 text-center text-gray-500">Loading your products...</Card>
        ) : totalProducts === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-6">
              Start building your smart home inventory by adding your first device
            </p>
            <Button onClick={() => router.push('/add-product')} size="lg">
              Add Your First Product
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([group, products]) => (
              <Card key={group} padding="none">
                <div className="p-6 border-b border-gray-100 bg-[#f0f9f2] rounded-t-xl">
                  <h2 className="text-lg font-bold text-[#1f4d2b]">
                    {group} <span className="text-[#3d8b54] font-normal">({products.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {products.map((userProduct) => (
                    <div key={userProduct.id} className="p-6 hover:bg-[#f0f9f2] transition-colors">
                      {editingId === userProduct.id ? (
                        /* Edit mode */
                        <div>
                          <div className="mb-4">
                            <p className="font-semibold text-gray-900">{userProduct.products.name}</p>
                            <p className="text-sm text-gray-500">{userProduct.products.brand}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                              <select
                                value={editForm.room}
                                onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">No room assigned</option>
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name</label>
                              <input
                                type="text"
                                value={editForm.custom_name}
                                onChange={(e) => setEditForm({ ...editForm, custom_name: e.target.value })}
                                placeholder="e.g. Front Door Lock"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                              <input
                                type="date"
                                value={editForm.purchase_date}
                                onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Add notes..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => saveEdit(userProduct.id)}
                              loading={saving}
                            >
                              Save Changes
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {userProduct.custom_name || userProduct.products.name}
                              </h3>
                              {userProduct.custom_name && (
                                <Badge variant="green">Custom Name</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 flex-wrap">
                              <span>{userProduct.products.brand}</span>
                              <span>•</span>
                              <span>{userProduct.products.name}</span>
                              {userProduct.room && (
                                <>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 bg-[#f0f9f2] border border-[#d1ecd7] rounded text-xs text-[#1f4d2b]">
                                    📍 {userProduct.room}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 mb-3">
                              {userProduct.products.protocols.map(protocol => (
                                <Badge key={protocol} variant="blue">{protocol}</Badge>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.entries(userProduct.products.ecosystems || {}).map(([ecosystem, level]) => (
                                <Badge
                                  key={ecosystem}
                                  variant={getEcosystemBadgeVariant(level as string)}
                                >
                                  {ecosystem.replace('_', ' ')}: {String(level || 'none')}
                                </Badge>
                              ))}
                            </div>

                            {userProduct.purchase_date && (
                              <p className="text-sm text-gray-600 mb-2">
                                📅 Purchased: {new Date(userProduct.purchase_date).toLocaleDateString()}
                              </p>
                            )}

                            {userProduct.quantity > 1 && (
                              <p className="text-sm text-gray-600 mb-2">
                                📦 Qty: {userProduct.quantity}
                              </p>
                            )}

                            {userProduct.notes && (
                              <p className="text-sm text-gray-600 bg-[#f0f9f2] border border-[#d1ecd7] p-3 rounded-lg mt-2">
                                💬 {userProduct.notes}
                              </p>
                            )}

                            {userProduct.products.notes && (
                              <p className="text-sm text-gray-500 mt-2">
                                ℹ️ {userProduct.products.notes}
                              </p>
                            )}

                            {userProduct.products.requires_hub !== 'false' && (
                              <p className="text-sm text-amber-600 mt-2">
                                {userProduct.products.requires_hub === 'thread_border_router'
                                  ? '⚠️ Requires Thread Border Router'
                                  : `⚠️ Hub required${userProduct.products.hub_name ? `: ${userProduct.products.hub_name}` : ''}`
                                }
                              </p>
                            )}
                          </div>

                          <div className="ml-4 flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(userProduct)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(userProduct.id)}
                                loading={deleting === userProduct.id}
                              >
                                Remove
                              </Button>
                            </div>
                            <a
                              href={generateAmazonLink(userProduct.products.name, userProduct.products.brand)}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              onClick={() => trackAmazonClick(supabase, userProduct.products.id, userProduct.products.name, userProduct.products.brand)}
                              className="text-xs text-[#FF9900] hover:text-[#e68a00] font-medium whitespace-nowrap"
                            >
                              Buy replacement →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-6">
          <AffiliateDisclosure />
        </div>
      </div>
    </div>
  );
}
