'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Stats {
  totalDevices: number;
  pendingRequests: number;
  totalUserProducts: number;
  totalUsers: number;
  generationsThisWeek: number;
  recentRequests: { id: string; device_name: string; brand: string; status: string; created_at: string; votes: number }[];
  recentImports: { id: string; run_at: string; trigger: string; status: string; products_imported: number }[];
}

const QUICK_LINKS = [
  { label: 'Review Device Requests', path: '/admin/requests',  icon: '📋', desc: 'Approve or reject community submissions' },
  { label: 'Device Library',         path: '/admin/devices',   icon: '🔌', desc: 'Edit, add, or delete products' },
  { label: 'Data Collector',         path: '/admin/collector', icon: '🔄', desc: 'Collect devices from external sources' },
  { label: 'View Analytics',         path: '/admin/analytics', icon: '📈', desc: 'Usage stats and trends' },
  { label: 'Manage Users',           path: '/admin/users',     icon: '👥', desc: 'Browse registered users' },
];

const STATUS_BADGE: Record<string, { label: string; variant: 'amber' | 'green' | 'red' | 'blue' | 'gray' }> = {
  pending:  { label: 'Pending',  variant: 'amber' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  added:    { label: 'Added',    variant: 'blue' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load stats');
        } else {
          setStats(json);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Overview of Home Hero Hub</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard label="Total Users"        value={stats.totalUsers}          valueColor="#2e6f40" />
            <StatsCard label="Total Devices"      value={stats.totalDevices}        valueColor="#3d8b54" />
            <StatsCard label="Pending Requests"   value={stats.pendingRequests}     valueColor="#f59e0b" />
            <StatsCard label="User Inventories"   value={stats.totalUserProducts}   valueColor="#6366f1" />
            <StatsCard label="Generations / Week" value={stats.generationsThisWeek} valueColor="#0891b2" />
          </div>
        ) : null}

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ label, path, icon, desc }) => (
              <Link
                key={path}
                href={path}
                className="flex items-start gap-4 bg-white border border-[#d1ecd7] rounded-xl p-4 hover:bg-[#f0f9f2] hover:border-[#a3d9b0] transition-colors group"
              >
                <span className="text-2xl mt-0.5">{icon}</span>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-[#2e6f40] text-sm transition-colors">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Device Requests */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-[#d1ecd7] flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Requests</h2>
                <Link href="/admin/requests" className="text-xs text-[#2e6f40] hover:underline font-medium">View all →</Link>
              </div>
              {stats.recentRequests.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 text-center">No requests yet.</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {stats.recentRequests.map(req => {
                    const badge = STATUS_BADGE[req.status] ?? { label: req.status, variant: 'gray' as const };
                    return (
                      <li key={req.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{req.device_name}</div>
                          <div className="text-xs text-gray-400">{req.brand} · {new Date(req.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{req.votes}v</span>
                          <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Recent Imports */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-[#d1ecd7] flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Imports</h2>
                <Link href="/admin/import" className="text-xs text-[#2e6f40] hover:underline font-medium">View all →</Link>
              </div>
              {stats.recentImports.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 text-center">No imports yet.</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {stats.recentImports.map(imp => (
                    <li key={imp.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{new Date(imp.run_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{imp.trigger} trigger</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">{imp.products_imported} imported</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          imp.status === 'completed' ? 'bg-green-100 text-green-700'
                          : imp.status === 'failed'  ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>{imp.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
