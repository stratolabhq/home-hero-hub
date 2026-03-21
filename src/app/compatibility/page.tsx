'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import AffiliateDisclosure from '@/components/AffiliateDisclosure';
import { generateAmazonLink, trackAmazonClick } from '@/lib/amazon-affiliate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: {
    alexa?: string;
    google_home?: string;
    apple_homekit?: string;
    smartthings?: string;
    matter?: string;
  };
  home_assistant?: string;
  requires_hub: string;
  hub_name?: string;
  features?: string[];
  notes?: string;
  price_range?: string | null;
  created_at?: string;
  is_bestseller?: boolean;
  bestseller_rank?: number | null;
}

interface InventoryItem {
  products: {
    name: string;
    protocols: string[];
    ecosystems: {
      alexa?: string;
      google_home?: string;
      apple_homekit?: string;
      smartthings?: string;
      matter?: string;
    };
    home_assistant?: string;
    hub_name?: string;
  };
}

const PRICE_BUCKETS = ['Budget (<$50)', 'Mid ($50–$150)', 'Premium (>$150)'] as const;
type PriceBucket = typeof PRICE_BUCKETS[number];

const ALL_PROTOCOLS = ['WiFi', 'Zigbee', 'Z-Wave', 'Thread', 'Matter', 'Bluetooth'] as const;

type SortKey = 'alpha' | 'price-asc' | 'compatible' | 'newest';

interface Filters {
  search: string;
  ecosystem: string;
  protocols: string[];
  categories: string[];
  priceBuckets: PriceBucket[];
  homeAssistant: boolean;
  myEcosystem: boolean;
  popularOnly: boolean;
  sort: SortKey;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  ecosystem: 'all',
  protocols: [],
  categories: [],
  priceBuckets: [],
  homeAssistant: false,
  myEcosystem: false,
  popularOnly: true,
  sort: 'alpha',
};

const LS_KEY = 'compatibility_filters_v1';

function loadFilters(): Filters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFilters(f: Filters) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(f)); } catch {}
}

function priceRangeToMidpoint(range?: string | null): number {
  if (!range || range === 'Unknown') return 9999;
  const nums = range.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 9999;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function matchesPriceBucket(product: Product, buckets: PriceBucket[]): boolean {
  if (buckets.length === 0) return true;
  const mid = priceRangeToMidpoint(product.price_range);
  return buckets.some(b => {
    if (b === 'Budget (<$50)')   return mid < 50;
    if (b === 'Mid ($50–$150)')  return mid >= 50 && mid <= 150;
    if (b === 'Premium (>$150)') return mid > 150;
    return false;
  });
}

function compatibilityScore(product: Product, userEcosystems: Set<string>): number {
  if (!userEcosystems.size) return 0;
  let score = 0;
  const ecos = product.ecosystems as Record<string, string>;
  for (const eco of userEcosystems) {
    if (ecos[eco] === 'full') score += 2;
    else if (ecos[eco] === 'partial') score += 1;
  }
  if (userEcosystems.has('home_assistant') && product.home_assistant === 'full') score += 2;
  return score;
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.search) n++;
  if (f.ecosystem !== 'all') n++;
  n += f.protocols.length;
  n += f.categories.length;
  n += f.priceBuckets.length;
  if (f.homeAssistant) n++;
  if (f.myEcosystem) n++;
  if (!f.popularOnly) n++;
  if (f.sort !== 'alpha') n++;
  return n;
}

function getEcosystemBadgeVariant(level?: string): 'green' | 'amber' | 'gray' {
  if (level === 'full') return 'green';
  if (level === 'partial') return 'amber';
  return 'gray';
}

// ═══════════════════════════════════════════════════════════════════════════

export default function CompatibilityChecker() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [user, setUser] = useState<any>(null);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [homeCheckDevice, setHomeCheckDevice] = useState<Product | null>(null);

  useEffect(() => {
    setFilters(loadFilters());
  }, []);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  useEffect(() => {
    fetchProducts(filters.popularOnly);
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts(filters.popularOnly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.popularOnly]);

  const fetchProducts = async (popularOnly = true) => {
    setLoading(true);
    let query = supabase.from('products').select('*').order('name');
    if (popularOnly) query = query.eq('is_popular', true);
    const { data, error } = await query;
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const loadInventory = async () => {
    if (inventoryLoaded || !user) return;
    setLoadingInventory(true);
    const { data } = await supabase
      .from('user_products')
      .select('products(name, protocols, ecosystems, home_assistant, hub_name)')
      .eq('user_id', user.id);
    setUserInventory((data as unknown as InventoryItem[]) || []);
    setInventoryLoaded(true);
    setLoadingInventory(false);
  };

  const checkAgainstHome = async (device: Product) => {
    if (homeCheckDevice?.id === device.id) { setHomeCheckDevice(null); return; }
    setHomeCheckDevice(device);
    if (!inventoryLoaded) await loadInventory();
  };

  const userEcosystems = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const item of userInventory) {
      const ecos = item.products.ecosystems as Record<string, string>;
      for (const [k, v] of Object.entries(ecos)) {
        if (v === 'full') s.add(k);
      }
      if (item.products.home_assistant === 'full') s.add('home_assistant');
    }
    return s;
  }, [userInventory]);

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category))).sort(),
    [products]
  );

  const patch = (update: Partial<Filters>) =>
    setFilters(prev => ({ ...prev, ...update }));

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const toggleProtocol = (p: string) =>
    patch({ protocols: filters.protocols.includes(p) ? filters.protocols.filter(x => x !== p) : [...filters.protocols, p] });

  const toggleCategory = (c: string) =>
    patch({ categories: filters.categories.includes(c) ? filters.categories.filter(x => x !== c) : [...filters.categories, c] });

  const togglePriceBucket = (b: PriceBucket) =>
    patch({ priceBuckets: filters.priceBuckets.includes(b) ? filters.priceBuckets.filter(x => x !== b) : [...filters.priceBuckets, b] });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const openCompare = () => {
    router.push(`/compare?ids=${[...selectedIds].join(',')}`);
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(product => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!product.name.toLowerCase().includes(q) && !product.brand.toLowerCase().includes(q)) return false;
      }
      if (filters.ecosystem !== 'all') {
        if (product.ecosystems[filters.ecosystem as keyof typeof product.ecosystems] !== 'full') return false;
      }
      if (filters.protocols.length > 0) {
        if (!filters.protocols.every(p => product.protocols.includes(p))) return false;
      }
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(product.category)) return false;
      }
      if (!matchesPriceBucket(product, filters.priceBuckets)) return false;
      if (filters.homeAssistant && product.home_assistant !== 'full') return false;
      if (filters.myEcosystem && userEcosystems.size > 0) {
        const ecos = product.ecosystems as Record<string, string>;
        const hasOverlap = [...userEcosystems].some(
          eco => eco === 'home_assistant' ? product.home_assistant === 'full' : ecos[eco] === 'full'
        );
        if (!hasOverlap) return false;
      }
      return true;
    });

    switch (filters.sort) {
      case 'alpha':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        list = [...list].sort((a, b) => priceRangeToMidpoint(a.price_range) - priceRangeToMidpoint(b.price_range));
        break;
      case 'compatible':
        list = [...list].sort((a, b) => compatibilityScore(b, userEcosystems) - compatibilityScore(a, userEcosystems));
        break;
      case 'newest':
        list = [...list].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
        break;
    }

    return list;
  }, [products, filters, userEcosystems]);

  const homeCheckResult = useMemo(() => {
    if (!homeCheckDevice || !inventoryLoaded || !userInventory.length) return null;
    const deviceFullEcos = (Object.entries(homeCheckDevice.ecosystems) as [string, string][])
      .filter(([_, v]) => v === 'full').map(([k]) => k);
    const sharedEcosystems = deviceFullEcos.filter(eco =>
      userInventory.some(item => (item.products.ecosystems as any)?.[eco] === 'full')
    );
    const compatibleCount = userInventory.filter(item => {
      const itemEco = item.products.ecosystems as any;
      return deviceFullEcos.some(eco => itemEco?.[eco] === 'full');
    }).length;
    const sharedProtocols = homeCheckDevice.protocols.filter(proto =>
      userInventory.some(item => item.products.protocols.includes(proto))
    );
    let hubWarning: string | null = null;
    if (homeCheckDevice.requires_hub && homeCheckDevice.requires_hub !== 'false') {
      const hubLabel = homeCheckDevice.requires_hub === 'thread_border_router'
        ? 'Thread Border Router' : (homeCheckDevice.hub_name || 'a hub');
      const hasHub = userInventory.some(item =>
        item.products.name.toLowerCase().includes(hubLabel.toLowerCase())
      );
      if (!hasHub) hubWarning = hubLabel;
    }
    const isCompatible = sharedEcosystems.length > 0 || sharedProtocols.length > 0;
    return { sharedEcosystems, compatibleCount, sharedProtocols, hubWarning, isCompatible, total: userInventory.length };
  }, [homeCheckDevice, userInventory, inventoryLoaded]);

  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Smart Home Compatibility Checker</h1>
          <p className="text-gray-600">
            Search for devices and check compatibility across ecosystems
            {user && <span className="ml-1">— or check any device against your home inventory</span>}
          </p>
        </div>

        {/* ── Filter panel ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">

          <div
            className="flex items-center justify-between p-4 md:p-5 cursor-pointer md:cursor-default"
            onClick={() => setFiltersOpen(v => !v)}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#2e6f40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span className="font-semibold text-gray-900">Filters &amp; Sort</span>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-[#2e6f40] text-white rounded-full text-xs font-semibold">
                  {activeCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); clearFilters(); }}
                  className="text-sm text-[#2e6f40] hover:text-[#1f4d2b] font-medium"
                >
                  Clear all
                </button>
              )}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform md:hidden ${filtersOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className={`border-t border-gray-100 ${filtersOpen ? 'block' : 'hidden'} md:block`}>
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-5">

              {/* Search */}
              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Name or brand..."
                  value={filters.search}
                  onChange={e => patch({ search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Sort */}
              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</label>
                <select
                  value={filters.sort}
                  onChange={e => patch({ sort: e.target.value as SortKey })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="alpha">Alphabetical (A–Z)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="compatible">Most Compatible</option>
                  <option value="newest">Newest Added</option>
                </select>
              </div>

              {/* Ecosystem */}
              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ecosystem</label>
                <select
                  value={filters.ecosystem}
                  onChange={e => patch({ ecosystem: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Ecosystems</option>
                  <option value="alexa">Amazon Alexa</option>
                  <option value="google_home">Google Home</option>
                  <option value="apple_homekit">Apple HomeKit</option>
                  <option value="smartthings">Samsung SmartThings</option>
                  <option value="matter">Matter</option>
                </select>
              </div>

              {/* Protocols */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Protocols</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PROTOCOLS.map(proto => (
                    <button
                      key={proto}
                      onClick={() => toggleProtocol(proto)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        filters.protocols.includes(proto)
                          ? 'bg-[#2e6f40] text-white border-[#2e6f40]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
                {filters.protocols.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">Must support all selected</p>
                )}
              </div>

              {/* Categories */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        filters.categories.includes(cat)
                          ? 'bg-[#3d8b54] text-white border-[#3d8b54]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price + Toggles */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Range</label>
                  <div className="space-y-1.5">
                    {PRICE_BUCKETS.map(bucket => (
                      <label key={bucket} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.priceBuckets.includes(bucket)}
                          onChange={() => togglePriceBucket(bucket)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{bucket}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggle: Popular Only */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => patch({ popularOnly: !filters.popularOnly })}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                      filters.popularOnly ? 'bg-[#2e6f40]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      filters.popularOnly ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <div>
                    <span className="text-sm text-gray-700">Popular devices only</span>
                    <span className="block text-xs text-gray-400">
                      {filters.popularOnly ? `~${products.length} consumer brands` : 'Showing all devices including obscure'}
                    </span>
                  </div>
                </label>

                {/* Toggle: Home Assistant */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => patch({ homeAssistant: !filters.homeAssistant })}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                      filters.homeAssistant ? 'bg-cyan-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      filters.homeAssistant ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-700">Works with Home Assistant</span>
                </label>

                {/* Toggle: My Ecosystem */}
                {user && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={async () => {
                        if (!inventoryLoaded) await loadInventory();
                        patch({ myEcosystem: !filters.myEcosystem });
                      }}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                        filters.myEcosystem ? 'bg-[#2e6f40]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        filters.myEcosystem ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <div>
                      <span className="text-sm text-gray-700">Works with my ecosystem</span>
                      {userEcosystems.size > 0 && (
                        <span className="block text-xs text-gray-400">
                          Detected: {[...userEcosystems].map(e => e.replace('_', ' ')).join(', ')}
                        </span>
                      )}
                      {filters.myEcosystem && !inventoryLoaded && loadingInventory && (
                        <span className="block text-xs text-gray-400">Loading inventory…</span>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Result count bar */}
            <div className="px-5 pb-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                Showing <span className="font-semibold text-gray-800">{filteredProducts.length}</span> of {products.length} {filters.popularOnly ? 'popular' : 'total'} devices
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[#2e6f40] hover:text-[#1f4d2b] text-xs font-medium"
                >
                  Clear selection ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Home compatibility panel ───────────────────────────────── */}
        {homeCheckDevice && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-[#6fbf7d]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {homeCheckDevice.name} — Your Home Compatibility
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{homeCheckDevice.brand}</p>
              </div>
              <button onClick={() => setHomeCheckDevice(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                ✕ Close
              </button>
            </div>

            {loadingInventory ? (
              <div className="py-8 text-center text-gray-500 text-sm">Loading your inventory…</div>
            ) : !inventoryLoaded || userInventory.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No devices in your inventory yet.{' '}
                <a href="/add-product" className="text-[#2e6f40] hover:underline">Add some devices</a> to check compatibility.
              </div>
            ) : homeCheckResult ? (
              <div className="space-y-5">
                <div className={`rounded-lg p-4 ${homeCheckResult.isCompatible ? 'bg-[#f0f9f2] border border-[#d1ecd7]' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`font-semibold text-sm ${homeCheckResult.isCompatible ? 'text-[#1f4d2b]' : 'text-amber-800'}`}>
                    {homeCheckResult.isCompatible
                      ? `✓ Compatible with your home — works with ${homeCheckResult.compatibleCount} of your ${homeCheckResult.total} device${homeCheckResult.total !== 1 ? 's' : ''}`
                      : `⚠ No direct ecosystem overlap with your current devices`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Shared Ecosystems</h4>
                    {homeCheckResult.sharedEcosystems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {homeCheckResult.sharedEcosystems.map(eco => (
                          <Badge key={eco} variant="green" size="md">{eco.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-500">No shared ecosystems</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Shared Protocols</h4>
                    {homeCheckResult.sharedProtocols.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {homeCheckResult.sharedProtocols.map(proto => (
                          <Badge key={proto} variant="blue" size="md">{proto}</Badge>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-500">No shared protocols</p>}
                  </div>
                </div>
                {homeCheckResult.hubWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>⚠ Hub required:</strong> This device needs a <strong>{homeCheckResult.hubWarning}</strong> — we don't see one in your inventory.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Device List ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Available Devices</h2>
            {selectedIds.size === 0 && (
              <p className="text-sm text-gray-500 mt-0.5">Select up to 3 devices to compare them side by side</p>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading devices…</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-3">No devices match your current filters.</p>
              <button onClick={clearFilters} className="text-sm text-[#2e6f40] hover:text-[#1f4d2b] font-medium">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredProducts.map(product => {
                const isSelected = selectedIds.has(product.id);
                const isDisabled = !isSelected && selectedIds.size >= 3;
                const score = userEcosystems.size > 0 ? compatibilityScore(product, userEcosystems) : -1;

                return (
                  <div
                    key={product.id}
                    className={`p-5 transition-colors ${isSelected ? 'bg-[#f0f9f2]' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="pt-1 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleSelect(product.id)}
                          className="w-5 h-5 rounded border-gray-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <Badge variant="gray">{product.brand}</Badge>
                          <Badge variant="purple">{product.category}</Badge>
                          {product.price_range && product.price_range !== 'Unknown' && (
                            <Badge variant="green">{product.price_range}</Badge>
                          )}
                          {score > 0 && (
                            <Badge variant="emerald">✓ Matches your home</Badge>
                          )}
                          {product.is_bestseller && product.bestseller_rank && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              ★ Best Seller #{product.bestseller_rank}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.protocols.map(protocol => (
                            <Badge key={protocol} variant="blue">{protocol}</Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {Object.entries(product.ecosystems).map(([ecosystem, level]) => (
                            <Badge key={ecosystem} variant={getEcosystemBadgeVariant(level)}>
                              {ecosystem.replace('_', ' ')}: {level || 'none'}
                            </Badge>
                          ))}
                          {product.home_assistant && product.home_assistant !== 'none' && (
                            <Badge variant={getEcosystemBadgeVariant(product.home_assistant)}>
                              home assistant: {product.home_assistant}
                            </Badge>
                          )}
                        </div>

                        {product.notes && (
                          <p className="text-sm text-gray-600 mt-2">{product.notes}</p>
                        )}

                        {product.requires_hub !== 'false' && product.requires_hub && (
                          <p className="text-sm text-amber-600 mt-1">
                            {product.requires_hub === 'thread_border_router'
                              ? '⚠️ Requires Thread Border Router'
                              : `⚠️ Hub required${product.hub_name ? `: ${product.hub_name}` : ''}`}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {user && (
                          <Button
                            onClick={() => checkAgainstHome(product)}
                            disabled={loadingInventory && homeCheckDevice?.id !== product.id}
                            variant={homeCheckDevice?.id === product.id ? 'secondary' : 'primary'}
                            size="sm"
                          >
                            {homeCheckDevice?.id === product.id ? '✓ My Home' : 'Check My Home'}
                          </Button>
                        )}
                        <a
                          href={generateAmazonLink(product.name, product.brand)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          onClick={() => trackAmazonClick(supabase, product.id, product.name, product.brand)}
                          className="text-xs text-[#FF9900] hover:text-[#e68a00] font-medium whitespace-nowrap"
                        >
                          Buy on Amazon →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-1">
        <AffiliateDisclosure />
      </div>

      {/* ── Floating Compare Bar ─────────────────────────────────────────── */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white border-t border-[#d1ecd7] shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selectedIds.size} devices selected</span>
              {selectedIds.size < 3 && <span className="ml-1">({3 - selectedIds.size} more allowed)</span>}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Clear
              </button>
              <Button onClick={openCompare} size="md">
                Compare ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
