'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { StatsCard } from '@/components/ui/StatsCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnalyticsData {
  totalDevices: number;
  totalUsers: number;
  totalUserProducts: number;
  popularDevices: { id: string; name: string; brand: string; category: string; add_count: number }[];
  topBrands: { brand: string; count: number }[];
  topCategories: { category: string; count: number }[];
  signupGraph: { date: string; count: number }[];
  requestStatusBreakdown: Record<string, number>;
}

function MiniBar({ value, max, color = '#2e6f40' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right font-medium">{value}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch('/api/admin/analytics', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load analytics');
        } else {
          setData(json);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const signupMax = Math.max(...data.signupGraph.map(d => d.count), 1);
  const brandMax = data.topBrands[0]?.count ?? 1;
  const catMax = data.topCategories[0]?.count ?? 1;
  const deviceMax = data.popularDevices[0]?.add_count ?? 1;
  const totalRequests = Object.values(data.requestStatusBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Analytics</h1>
          <p className="text-gray-500 text-sm">Usage stats and trends</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard label="Total Users"         value={data.totalUsers}        valueColor="#2e6f40" />
          <StatsCard label="Total Devices"       value={data.totalDevices}      valueColor="#3d8b54" />
          <StatsCard label="Inventory Entries"   value={data.totalUserProducts} valueColor="#6366f1" />
          <StatsCard label="Total Requests"      value={totalRequests}          valueColor="#f59e0b" />
        </div>

        {/* User Sign-up Graph */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">User Sign-ups (Last 30 Days)</h2>
          <p className="text-xs text-gray-400 mb-5">Daily new user registrations</p>
          <div className="flex items-end gap-0.5 h-28">
            {data.signupGraph.map(({ date, count }) => {
              const heightPct = signupMax > 0 ? (count / signupMax) * 100 : 0;
              return (
                <div
                  key={date}
                  className="flex-1 group relative"
                  style={{ minWidth: 0 }}
                  title={`${date}: ${count} sign-up${count !== 1 ? 's' : ''}`}
                >
                  <div
                    className="w-full rounded-t transition-colors"
                    style={{
                      height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%`,
                      minHeight: count > 0 ? '4px' : '0',
                      backgroundColor: count > 0 ? '#2e6f40' : '#e5e7eb',
                    }}
                  />
                  {/* Tooltip */}
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                    {date.slice(5)}: {count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{data.signupGraph[0]?.date}</span>
            <span>{data.signupGraph[data.signupGraph.length - 1]?.date}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Request Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Device Request Status</h2>
            <div className="space-y-3">
              {Object.entries(data.requestStatusBreakdown).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 font-medium">{status}</span>
                    <span className="text-gray-500">{Math.round((count / totalRequests) * 100)}%</span>
                  </div>
                  <MiniBar
                    value={count}
                    max={totalRequests}
                    color={
                      status === 'pending' ? '#f59e0b'
                      : status === 'approved' ? '#10b981'
                      : status === 'rejected' ? '#ef4444'
                      : '#6366f1'
                    }
                  />
                </div>
              ))}
              {totalRequests === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
            </div>
          </div>

          {/* Most Popular Devices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Most Popular Devices</h2>
            {data.popularDevices.length === 0 ? (
              <p className="text-sm text-gray-500">No inventory data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.popularDevices.map(device => (
                  <div key={device.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 truncate block" title={device.name}>{device.name}</span>
                        <span className="text-xs text-gray-400">{device.brand} · {device.category}</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{device.add_count} users</span>
                    </div>
                    <MiniBar value={device.add_count} max={deviceMax} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Requested Brands */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Top Requested Brands</h2>
            {data.topBrands.length === 0 ? (
              <p className="text-sm text-gray-500">No request data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topBrands.map(({ brand, count }) => (
                  <div key={brand}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{brand}</span>
                    </div>
                    <MiniBar value={count} max={brandMax} color="#6366f1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Requested Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Top Requested Categories</h2>
            {data.topCategories.length === 0 ? (
              <p className="text-sm text-gray-500">No request data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topCategories.map(({ category, count }) => (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{category}</span>
                    </div>
                    <MiniBar value={count} max={catMax} color="#0891b2" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
