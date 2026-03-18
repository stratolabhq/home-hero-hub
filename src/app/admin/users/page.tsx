'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  device_count: number;
}

interface UserDevice {
  product_id: string;
  products: { name: string; brand: string; category: string } | { name: string; brand: string; category: string }[] | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDevices, setUserDevices] = useState<Record<string, UserDevice[]>>({});
  const [devicesLoading, setDevicesLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch('/api/admin/users-list', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load users');
        } else {
          setUsers(json.users);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => u.email.toLowerCase().includes(q));
  }, [users, search]);

  const loadUserDevices = async (userId: string) => {
    if (userDevices[userId]) {
      setExpandedUser(expandedUser === userId ? null : userId);
      return;
    }
    setExpandedUser(userId);
    setDevicesLoading(userId);
    const { data } = await supabase
      .from('user_products')
      .select('product_id, products(name, brand, category)')
      .eq('user_id', userId);
    setUserDevices(prev => ({ ...prev, [userId]: (data as unknown as UserDevice[]) ?? [] }));
    setDevicesLoading(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Users</h1>
          <p className="text-gray-500 text-sm">{users.length} registered users</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40] focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Sign-up Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Last Sign-in</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Devices</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <>
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-[#f0f9f2] transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#f0f9f2] border border-[#d1ecd7] font-semibold text-[#2e6f40] text-sm">
                            {user.device_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.device_count > 0 && (
                            <button
                              onClick={() => loadUserDevices(user.id)}
                              className="text-xs text-[#2e6f40] hover:text-[#1f4d2b] font-medium"
                            >
                              {expandedUser === user.id ? 'Hide inventory' : 'View inventory'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedUser === user.id && (
                        <tr key={`${user.id}-expand`} className="bg-[#f0f9f2]">
                          <td colSpan={5} className="px-6 py-4">
                            {devicesLoading === user.id ? (
                              <p className="text-xs text-gray-500">Loading devices...</p>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Device Inventory</p>
                                {(userDevices[user.id] ?? []).length === 0 ? (
                                  <p className="text-xs text-gray-500">No devices in inventory.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {(userDevices[user.id] ?? []).map(d => {
                                      const prod = Array.isArray(d.products) ? d.products[0] : d.products;
                                      return (
                                        <span key={d.product_id} className="px-2.5 py-1 bg-white border border-[#d1ecd7] rounded-full text-xs text-gray-700">
                                          {prod?.name ?? d.product_id}
                                          {prod?.brand && <span className="text-gray-400"> · {prod.brand}</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
