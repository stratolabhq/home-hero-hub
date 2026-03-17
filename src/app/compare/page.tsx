'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
  price?: string | null;
  image_url?: string | null;
}

const PROTOCOL_COLORS: Record<string, string> = {
  WiFi: '#10B981',
  Zigbee: '#F59E0B',
  'Z-Wave': '#EF4444',
  Thread: '#8B5CF6',
  Matter: '#6366F1',
  Bluetooth: '#3B82F6',
};

const ECOSYSTEM_LABELS: Record<string, string> = {
  alexa: 'Amazon Alexa',
  google_home: 'Google Home',
  apple_homekit: 'Apple HomeKit',
  smartthings: 'SmartThings',
  matter: 'Matter',
};

function levelColor(level?: string) {
  if (level === 'full') return 'bg-green-100 text-green-800';
  if (level === 'partial') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-500';
}

function levelLabel(level?: string) {
  if (level === 'full') return 'Full';
  if (level === 'partial') return 'Partial';
  return 'None';
}

function ComparePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // for mobile swipe

  const ids = useMemo(() => {
    const raw = params.get('ids') ?? '';
    return raw.split(',').filter(Boolean).slice(0, 3);
  }, [params]);

  useEffect(() => {
    if (!ids.length) {
      setLoading(false);
      return;
    }
    supabase
      .from('products')
      .select('*')
      .in('id', ids)
      .then(({ data }) => {
        if (data) {
          // Preserve the order from the URL
          const ordered = ids.map(id => data.find(p => p.id === id)).filter(Boolean) as Product[];
          setProducts(ordered);
        }
        setLoading(false);
      });
  }, [ids]);

  const allProtocols = useMemo(
    () => Array.from(new Set(products.flatMap(p => p.protocols))).sort(),
    [products]
  );

  // A protocol is "different" if not all devices support it
  const isDifferentProtocol = (protocol: string) =>
    !products.every(p => p.protocols.includes(protocol));

  const shareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading comparison...</p>
      </div>
    );
  }

  if (!ids.length || products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center max-w-md">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No devices to compare</h1>
          <p className="text-gray-600 mb-6">Select 2–3 devices from the compatibility checker to compare them.</p>
          <button
            onClick={() => router.push('/compatibility')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const colCount = products.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <button
              onClick={() => router.push('/compatibility')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Search
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Device Comparison</h1>
            <p className="text-gray-600 mt-1">Comparing {products.length} devices side by side</p>
          </div>
          <button
            onClick={shareUrl}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors flex-shrink-0 ${
              copied
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {copied ? 'Link Copied!' : 'Share Comparison'}
          </button>
        </div>

        {/* ── DESKTOP: side-by-side table ── */}
        <div className="hidden md:block">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Product header row */}
            <div className={`grid border-b border-gray-200`} style={{ gridTemplateColumns: `200px repeat(${colCount}, 1fr)` }}>
              <div className="p-4 bg-gray-50" />
              {products.map(p => (
                <div key={p.id} className="p-5 border-l border-gray-100">
                  {p.image_url && (
                    <div className="h-20 flex items-center justify-center mb-3 bg-gray-50 rounded-lg overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{p.brand}</p>
                </div>
              ))}
            </div>

            {/* Row: Category */}
            <CompareRow label="Category" colCount={colCount}>
              {products.map(p => (
                <div key={p.id} className="p-4 border-l border-gray-100">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">{p.category}</span>
                </div>
              ))}
            </CompareRow>

            {/* Row: Protocols */}
            <CompareRow label="Protocols" colCount={colCount} alt>
              {products.map(p => (
                <div key={p.id} className="p-4 border-l border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {allProtocols.map(proto => {
                      const has = p.protocols.includes(proto);
                      const diff = isDifferentProtocol(proto);
                      return (
                        <span
                          key={proto}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            !has
                              ? 'bg-red-50 text-red-400 line-through'
                              : diff
                              ? 'text-white'
                              : 'text-white'
                          }`}
                          style={has ? { backgroundColor: PROTOCOL_COLORS[proto] ?? '#6B7280' } : undefined}
                          title={!has ? `${p.name} doesn't support ${proto}` : undefined}
                        >
                          {proto}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CompareRow>

            {/* Rows: Ecosystems */}
            {Object.entries(ECOSYSTEM_LABELS).map(([key, label], i) => (
              <CompareRow key={key} label={label} colCount={colCount} alt={i % 2 === 0}>
                {products.map(p => {
                  const level = p.ecosystems[key as keyof typeof p.ecosystems];
                  return (
                    <div key={p.id} className="p-4 border-l border-gray-100">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${levelColor(level)}`}>
                        {levelLabel(level)}
                      </span>
                    </div>
                  );
                })}
              </CompareRow>
            ))}

            {/* Row: Home Assistant */}
            <CompareRow label="Home Assistant" colCount={colCount}>
              {products.map(p => (
                <div key={p.id} className="p-4 border-l border-gray-100">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${levelColor(p.home_assistant)}`}>
                    {levelLabel(p.home_assistant)}
                  </span>
                </div>
              ))}
            </CompareRow>

            {/* Row: Hub Required */}
            <CompareRow label="Hub Required" colCount={colCount} alt>
              {products.map(p => (
                <div key={p.id} className="p-4 border-l border-gray-100">
                  {p.requires_hub === 'false' || !p.requires_hub ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">No</span>
                  ) : p.requires_hub === 'thread_border_router' ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">Thread BR</span>
                  ) : (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium" title={p.hub_name}>
                      {p.hub_name ?? 'Yes'}
                    </span>
                  )}
                </div>
              ))}
            </CompareRow>

            {/* Row: Features */}
            <CompareRow label="Features" colCount={colCount}>
              {products.map(p => (
                <div key={p.id} className="p-4 border-l border-gray-100">
                  {p.features && p.features.length > 0 ? (
                    <ul className="space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                          <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              ))}
            </CompareRow>

            {/* Row: Notes */}
            {products.some(p => p.notes) && (
              <CompareRow label="Notes" colCount={colCount} alt>
                {products.map(p => (
                  <div key={p.id} className="p-4 border-l border-gray-100">
                    <p className="text-xs text-gray-600">{p.notes ?? '—'}</p>
                  </div>
                ))}
              </CompareRow>
            )}

            {/* Row: Price */}
            {products.some(p => p.price) && (
              <CompareRow label="Price Range" colCount={colCount}>
                {products.map(p => (
                  <div key={p.id} className="p-4 border-l border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">{p.price ?? '—'}</span>
                  </div>
                ))}
              </CompareRow>
            )}
          </div>
        </div>

        {/* ── MOBILE: stacked cards with swipe ── */}
        <div className="md:hidden">
          {/* Tab selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-4">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActiveIndex(i)}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors leading-tight text-center ${
                  activeIndex === i ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                {p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name}
              </button>
            ))}
          </div>

          {/* Swipeable card strip */}
          <div
            className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-2"
            style={{ scrollbarWidth: 'none' }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const index = Math.round(el.scrollLeft / el.offsetWidth);
              setActiveIndex(index);
            }}
          >
            {products.map((p) => (
              <div
                key={p.id}
                className="snap-start flex-shrink-0 w-full bg-white rounded-xl shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="p-5 border-b border-gray-100 bg-blue-50">
                  {p.image_url && (
                    <div className="h-24 flex items-center justify-center mb-3 bg-white rounded-lg overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h2 className="font-bold text-gray-900">{p.name}</h2>
                  <p className="text-sm text-gray-500">{p.brand}</p>
                </div>

                <div className="divide-y divide-gray-100">
                  <MobileRow label="Category">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">{p.category}</span>
                  </MobileRow>

                  <MobileRow label="Protocols">
                    <div className="flex flex-wrap gap-1">
                      {allProtocols.map(proto => {
                        const has = p.protocols.includes(proto);
                        const diff = isDifferentProtocol(proto);
                        return (
                          <span
                            key={proto}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              !has ? 'bg-red-50 text-red-400 line-through' : 'text-white'
                            }`}
                            style={has ? { backgroundColor: PROTOCOL_COLORS[proto] ?? '#6B7280' } : undefined}
                          >
                            {proto}
                          </span>
                        );
                      })}
                    </div>
                  </MobileRow>

                  {Object.entries(ECOSYSTEM_LABELS).map(([key, label]) => {
                    const level = p.ecosystems[key as keyof typeof p.ecosystems];
                    return (
                      <MobileRow key={key} label={label}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${levelColor(level)}`}>
                          {levelLabel(level)}
                        </span>
                      </MobileRow>
                    );
                  })}

                  <MobileRow label="Home Assistant">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${levelColor(p.home_assistant)}`}>
                      {levelLabel(p.home_assistant)}
                    </span>
                  </MobileRow>

                  <MobileRow label="Hub Required">
                    {p.requires_hub === 'false' || !p.requires_hub ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">No</span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                        {p.requires_hub === 'thread_border_router' ? 'Thread BR' : (p.hub_name ?? 'Yes')}
                      </span>
                    )}
                  </MobileRow>

                  {(p.features?.length ?? 0) > 0 && (
                    <MobileRow label="Features">
                      <ul className="space-y-1">
                        {p.features!.map((f, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                            <span className="text-blue-400 mt-0.5">•</span>{f}
                          </li>
                        ))}
                      </ul>
                    </MobileRow>
                  )}

                  {p.notes && (
                    <MobileRow label="Notes">
                      <p className="text-xs text-gray-600">{p.notes}</p>
                    </MobileRow>
                  )}

                  {p.price && (
                    <MobileRow label="Price">
                      <span className="text-sm font-semibold text-gray-900">{p.price}</span>
                    </MobileRow>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-3">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
          <button
            onClick={() => router.push('/compatibility')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Search
          </button>
          <button
            onClick={shareUrl}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copied ? '✓ Copied!' : 'Share Comparison'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Desktop table row wrapper
function CompareRow({
  label, colCount, alt = false, children,
}: {
  label: string;
  colCount: number;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid ${alt ? 'bg-gray-50/60' : ''}`}
      style={{ gridTemplateColumns: `200px repeat(${colCount}, 1fr)` }}
    >
      <div className="p-4 flex items-start">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  );
}

// Mobile row wrapper
function MobileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  );
}

// Suspense wrapper required for useSearchParams in App Router
export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading comparison...</p>
      </div>
    }>
      <ComparePage />
    </Suspense>
  );
}
