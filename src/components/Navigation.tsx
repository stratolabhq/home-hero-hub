'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Settings, Package } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  function getInitials(email: string): string {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Dashboard', path: '/dashboard', icon: '📊', requiresAuth: true },
    { name: 'Compatibility', path: '/compatibility', icon: '🔍' },
    { name: 'Controllers', path: '/controllers', icon: '📡' },
    { name: 'Add Product', path: '/add-product', icon: '➕', requiresAuth: true },
    { name: 'My Products', path: '/my-products', icon: '📦', requiresAuth: true },
    { name: 'Getting Started', path: '/getting-started', icon: '📚' },
    { name: 'Request Device', path: '/request-device', icon: '🙋' },
  ];

  const visibleNavItems = navItems.filter(item => !item.requiresAuth || user);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-[#d1ecd7] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo + desktop nav */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-green-gradient" style={{
                background: 'linear-gradient(135deg, #2e6f40, #3d8b54)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Home Hero Hub
              </span>
            </Link>

            <div className="hidden md:ml-10 md:flex md:space-x-1">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-[#f0f9f2] text-[#2e6f40] font-semibold'
                      : 'text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center p-1 rounded-full hover:bg-[#f0f9f2] transition-colors"
                  aria-label="User menu"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-[#2e6f40] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {getInitials(user.email)}
                      </span>
                    </div>
                    {isAdmin && (
                      <div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full"
                        title="Admin"
                      />
                    )}
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">{isAdmin ? 'Administrator' : 'User'}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        href="/my-products"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Package className="w-4 h-4" />
                        My Products
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowDropdown(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => { setShowDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40] rounded-lg font-medium text-sm transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-[#2e6f40] text-white rounded-lg hover:bg-[#3d8b54] font-medium text-sm transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40] focus:outline-none transition-colors"
            >
              <span className="sr-only">Open menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#d1ecd7] bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-[#f0f9f2] text-[#2e6f40] font-semibold'
                    : 'text-gray-700 hover:bg-[#f0f9f2] hover:text-[#2e6f40]'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}

            {user ? (
              <div className="pt-4 border-t border-[#d1ecd7]">
                <div className="px-3 py-2 flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-[#2e6f40] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{getInitials(user.email)}</span>
                    </div>
                    {isAdmin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full" title="Admin" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500">{isAdmin ? 'Administrator' : 'User'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    <Settings className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-[#d1ecd7] space-y-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-[#f0f9f2] rounded-lg font-medium text-center"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 bg-[#2e6f40] text-white rounded-lg hover:bg-[#3d8b54] font-medium text-center transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
