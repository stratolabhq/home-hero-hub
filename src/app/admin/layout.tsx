'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/admin',             icon: '📊' },
  { label: 'Device Requests', path: '/admin/requests',    icon: '📋' },
  { label: 'Device Library',  path: '/admin/devices',     icon: '🔌' },
  { label: 'Data Collector',  path: '/admin/collector',   icon: '🔄' },
  { label: 'Users',           path: '/admin/users',       icon: '👥' },
  { label: 'Analytics',       path: '/admin/analytics',   icon: '📈' },
  { label: 'Import (Amazon)', path: '/admin/import',      icon: '⬆️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      const email = session.user?.email;
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (!adminEmail || email !== adminEmail) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 text-center border border-gray-100 max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">You do not have permission to access admin pages.</p>
          <Link
            href="/"
            className="px-4 py-2 bg-[#2e6f40] text-white rounded-lg hover:bg-[#3d8b54] text-sm font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#d1ecd7] flex-shrink-0 flex flex-col sticky top-16 h-[calc(100vh-64px)]">
        <div className="px-4 py-3 border-b border-[#d1ecd7]">
          <div className="text-xs font-semibold text-[#2e6f40] uppercase tracking-widest">Admin Panel</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ label, path, icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-[#f0f9f2] text-[#2e6f40] font-semibold'
                  : 'text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40]'
              }`}
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[#d1ecd7]">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-[#2e6f40] rounded-lg hover:bg-[#f0f9f2] transition-colors"
          >
            <span>←</span>
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
