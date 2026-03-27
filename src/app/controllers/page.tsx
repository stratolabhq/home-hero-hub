'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { generateAmazonLink } from '@/lib/amazon-affiliate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Controller {
  id: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  subcategory: string | null;
  protocols: string[];
  chipset: string | null;
  connection_type: string | null;
  max_devices: number | null;
  ecosystems: Record<string, string>;
  home_assistant: string | null;
  ha_setup_difficulty: string | null;
  ha_notes: string | null;
  zigbee_version: string | null;
  zwave_version: string | null;
  thread_support: boolean;
  price_range: string | null;
  image_url: string | null;
  is_popular: boolean;
  features: string[] | null;
  notes: string | null;
  recommended_for: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  tags: string[] | null;
}

// ─── Protocol badge colours ───────────────────────────────────────────────────

const PROTOCOL_COLORS: Record<string, string> = {
  'Zigbee':  'bg-amber-100 text-amber-800',
  'Z-Wave':  'bg-blue-100 text-blue-800',
  'Thread':  'bg-purple-100 text-purple-800',
  'Matter':  'bg-teal-100 text-teal-800',
  'WiFi':    'bg-green-100 text-green-800',
  'Ethernet':'bg-gray-100 text-gray-700',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  'Easy':     'bg-green-100 text-green-800',
  'Medium':   'bg-yellow-100 text-yellow-800',
  'Advanced': 'bg-red-100 text-red-800',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProtocolFilters(controllers: Controller[]): string[] {
  const all = new Set<string>();
  controllers.forEach(c => c.protocols?.forEach(p => all.add(p)));
  return ['All', ...Array.from(all).sort()];
}

function getConnectionFilters(controllers: Controller[]): string[] {
  const all = new Set<string>();
  controllers.forEach(c => {
    if (c.connection_type) {
      // Normalise compound types like "Ethernet/USB" → split
      c.connection_type.split('/').forEach(t => all.add(t.trim()));
    }
  });
  return ['All', ...Array.from(all).sort()];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ControllersPage() {
  const searchParams = useSearchParams();
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [protocolFilter, setProtocolFilter] = useState(searchParams.get('protocol') ?? 'All');
  const [connectionFilter, setConnectionFilter] = useState('All');
  const [haFilter, setHaFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'devices'>('popular');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, product_id, name, brand, category, type, subcategory, protocols, chipset, ' +
          'connection_type, max_devices, ecosystems, home_assistant, ha_setup_difficulty, ' +
          'ha_notes, zigbee_version, zwave_version, thread_support, price_range, image_url, ' +
          'is_popular, features, notes, recommended_for, pros, cons, tags'
        )
        .eq('is_controller', true)
        .order('is_popular', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setControllers((data as unknown as Controller[]) || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const protocolOptions = useMemo(() => getProtocolFilters(controllers), [controllers]);
  const connectionOptions = useMemo(() => getConnectionFilters(controllers), [controllers]);
  const haOptions = useMemo(() => {
    const all = new Set<string>();
    controllers.forEach(c => {
      c.home_assistant?.split(',').forEach(h => all.add(h.trim()));
    });
    return ['All', ...Array.from(all).sort()];
  }, [controllers]);

  const PRICE_ORDER: Record<string, number> = {
    'Under $20': 1, '$20-$50': 2, '$50-$100': 3, '$100-$200': 4, '$200+': 5,
  };

  const filtered = useMemo(() => {
    let list = controllers.filter(c => {
      if (protocolFilter !== 'All' && !c.protocols?.includes(protocolFilter)) return false;
      if (connectionFilter !== 'All') {
        const parts = c.connection_type?.split('/').map(p => p.trim()) ?? [];
        if (!parts.includes(connectionFilter)) return false;
      }
      if (haFilter !== 'All') {
        const haList = c.home_assistant?.split(',').map(h => h.trim()) ?? [];
        if (!haList.includes(haFilter)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'popular') return (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0);
      if (sortBy === 'price_asc') return (PRICE_ORDER[a.price_range ?? ''] ?? 9) - (PRICE_ORDER[b.price_range ?? ''] ?? 9);
      if (sortBy === 'price_desc') return (PRICE_ORDER[b.price_range ?? ''] ?? 0) - (PRICE_ORDER[a.price_range ?? ''] ?? 0);
      if (sortBy === 'devices') return (b.max_devices ?? 0) - (a.max_devices ?? 0);
      return 0;
    });

    return list;
  }, [controllers, protocolFilter, connectionFilter, haFilter, sortBy]);

  const compareControllers = controllers.filter(c => compareIds.includes(c.id));

  function toggleCompare(id: string) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#2e6f40] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading controllers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#f0f9f2] to-[#d1ecd7] py-14">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#a3d9b0] rounded-full text-sm font-medium text-[#1f4d2b] mb-6 shadow-sm">
            📡 Zigbee · Z-Wave · Matter · Thread
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Protocol Controllers &{' '}
            <span style={{
              background: 'linear-gradient(135deg, #2e6f40, #3d8b54)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Coordinators
            </span>
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Essential hardware for Home Assistant users. Find the right Zigbee, Z-Wave,
            Matter, or Thread coordinator for your smart home.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: `${controllers.length}+`, label: 'Controllers Listed' },
              { value: '4', label: 'Protocols Covered' },
              { value: '3', label: 'HA Integrations' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-[#d1ecd7]">
                <div className="text-2xl font-bold text-[#2e6f40]">{s.value}</div>
                <div className="text-xs text-gray-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is a Coordinator? ────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What is a Protocol Coordinator?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="text-2xl mb-3">📡</div>
              <h3 className="font-semibold text-gray-900 mb-2">Zigbee Coordinator</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A USB stick or gateway that acts as the central hub for your Zigbee network.
                All Zigbee devices (bulbs, sensors, plugs) connect through it. Works with
                Home Assistant via ZHA or Zigbee2MQTT.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="text-2xl mb-3">🔊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Z-Wave Controller</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A USB stick that manages your Z-Wave mesh network. Z-Wave uses a dedicated
                900 MHz frequency for less interference. Works with Home Assistant via
                Z-Wave JS. Supports up to 232 devices.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="text-2xl mb-3">🧵</div>
              <h3 className="font-semibold text-gray-900 mb-2">Thread Border Router</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A device that bridges Thread networks to your WiFi/Ethernet network. Required
                for Thread-based Matter devices. Built into many modern hubs like Apple
                HomePod mini and Amazon Echo 4th gen.
              </p>
            </div>
          </div>
          <div className="mt-6 bg-[#f0f9f2] border border-[#d1ecd7] rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Coordinator vs. Router vs. End Device</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">Coordinator:</span> The brain. One per Zigbee network. Your USB stick or gateway. Required to create the network.
              </div>
              <div>
                <span className="font-medium text-gray-900">Router:</span> Extends range. Mains-powered devices (plugs, switches) act as routers, relaying messages to distant devices.
              </div>
              <div>
                <span className="font-medium text-gray-900">End Device:</span> Battery-powered devices (sensors, remotes) that only send/receive. They do not relay messages.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <section className="py-8 bg-gray-50 border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 items-end">

            {/* Protocol */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Protocol</label>
              <div className="flex gap-1 flex-wrap">
                {protocolOptions.map(p => (
                  <button
                    key={p}
                    onClick={() => setProtocolFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      protocolFilter === p
                        ? 'bg-[#2e6f40] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-[#2e6f40] hover:text-[#2e6f40]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Connection</label>
              <div className="flex gap-1 flex-wrap">
                {connectionOptions.map(c => (
                  <button
                    key={c}
                    onClick={() => setConnectionFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      connectionFilter === c
                        ? 'bg-[#2e6f40] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-[#2e6f40] hover:text-[#2e6f40]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* HA Integration */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">HA Integration</label>
              <select
                value={haFilter}
                onChange={e => setHaFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
              >
                {haOptions.map(h => (
                  <option key={h} value={h}>{h === 'All' ? 'All Integrations' : h}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1 ml-auto">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
              >
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="devices">Max Devices</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> of {controllers.length} controllers
            </p>
            {compareIds.length > 0 && (
              <button
                onClick={() => setShowCompare(true)}
                className="px-4 py-1.5 bg-[#2e6f40] text-white text-sm font-semibold rounded-lg hover:bg-[#3d8b54] transition-colors"
              >
                Compare ({compareIds.length})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Controller Cards ──────────────────────────────────────────── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No controllers match your filters.</p>
              <button
                onClick={() => { setProtocolFilter('All'); setConnectionFilter('All'); setHaFilter('All'); }}
                className="mt-4 text-[#2e6f40] font-semibold hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(controller => {
                const isExpanded = expandedId === controller.id;
                const inCompare = compareIds.includes(controller.id);
                const amazonUrl = generateAmazonLink(controller.name, controller.brand);

                return (
                  <div
                    key={controller.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-md flex flex-col ${
                      inCompare ? 'border-[#2e6f40] shadow-md' : 'border-gray-200'
                    }`}
                  >
                    {/* Card header */}
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-0.5">{controller.brand}</p>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {controller.name}
                          </h3>
                        </div>
                        {controller.is_popular && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-[#f0f9f2] text-[#2e6f40] text-xs font-semibold rounded-full border border-[#a3d9b0]">
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Protocol badges */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {controller.protocols?.map(p => (
                          <span key={p} className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROTOCOL_COLORS[p] ?? 'bg-gray-100 text-gray-700'}`}>
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* Specs row */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        {controller.connection_type && (
                          <div>
                            <span className="font-medium text-gray-700">Connection:</span>{' '}
                            {controller.connection_type}
                          </div>
                        )}
                        {controller.max_devices && (
                          <div>
                            <span className="font-medium text-gray-700">Max devices:</span>{' '}
                            {controller.max_devices}+
                          </div>
                        )}
                        {controller.chipset && (
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">Chipset:</span>{' '}
                            {controller.chipset}
                          </div>
                        )}
                      </div>

                      {/* HA integration */}
                      {controller.home_assistant && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-xs font-medium text-gray-500 mr-1">HA:</span>
                          {controller.home_assistant.split(',').map(h => h.trim()).map(h => (
                            <span key={h} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                              {h}
                            </span>
                          ))}
                          {controller.ha_setup_difficulty && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${DIFFICULTY_COLORS[controller.ha_setup_difficulty] ?? ''}`}>
                              {controller.ha_setup_difficulty}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      {controller.price_range && (
                        <p className="text-sm font-bold text-gray-900 mb-3">{controller.price_range}</p>
                      )}

                      {/* Expandable details */}
                      {isExpanded && (
                        <div className="mt-3 border-t border-gray-100 pt-3 space-y-3 text-sm">
                          {controller.ha_notes && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Home Assistant Notes</p>
                              <p className="text-gray-600 text-xs leading-relaxed">{controller.ha_notes}</p>
                            </div>
                          )}
                          {controller.pros && controller.pros.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Pros</p>
                              <ul className="space-y-1">
                                {controller.pros.map((p, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                    <span className="text-[#2e6f40] mt-0.5">✓</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {controller.cons && controller.cons.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Cons</p>
                              <ul className="space-y-1">
                                {controller.cons.map((c, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                    <span className="text-red-400 mt-0.5">✗</span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {controller.recommended_for && controller.recommended_for.length > 0 && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Best For</p>
                              <div className="flex flex-wrap gap-1">
                                {controller.recommended_for.map(r => (
                                  <span key={r} className="px-2 py-0.5 bg-[#f0f9f2] text-[#2e6f40] text-xs rounded-full border border-[#d1ecd7]">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : controller.id)}
                        className="text-xs text-[#2e6f40] font-medium hover:text-[#1f4d2b] transition-colors flex-1"
                      >
                        {isExpanded ? 'Hide details ↑' : 'Show details ↓'}
                      </button>

                      <button
                        onClick={() => toggleCompare(controller.id)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                          inCompare
                            ? 'bg-[#2e6f40] text-white'
                            : 'text-gray-500 hover:text-[#2e6f40]'
                        }`}
                        title="Add to compare"
                      >
                        {inCompare ? 'Comparing' : '+ Compare'}
                      </button>

                      <a
                        href={amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#FF9900] hover:text-[#e08000] transition-colors"
                      >
                        Amazon →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Compare Modal ─────────────────────────────────────────────── */}
      {showCompare && compareControllers.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mt-8 mb-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Compare Controllers</h2>
              <button
                onClick={() => setShowCompare(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-gray-500 font-medium w-36">Feature</th>
                    {compareControllers.map(c => (
                      <th key={c.id} className="p-4 text-center">
                        <div className="font-semibold text-gray-900 text-xs leading-tight">{c.brand}</div>
                        <div className="font-semibold text-gray-700 text-xs leading-tight mt-0.5">{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Protocols', key: (c: Controller) => c.protocols?.join(', ') ?? '-' },
                    { label: 'Chipset', key: (c: Controller) => c.chipset ?? '-' },
                    { label: 'Connection', key: (c: Controller) => c.connection_type ?? '-' },
                    { label: 'Max Devices', key: (c: Controller) => c.max_devices ? `${c.max_devices}+` : '-' },
                    { label: 'Price Range', key: (c: Controller) => c.price_range ?? '-' },
                    { label: 'HA Integration', key: (c: Controller) => c.home_assistant ?? '-' },
                    { label: 'Setup Difficulty', key: (c: Controller) => c.ha_setup_difficulty ?? '-' },
                    { label: 'Thread Support', key: (c: Controller) => c.thread_support ? 'Yes' : 'No' },
                    { label: 'Zigbee Version', key: (c: Controller) => c.zigbee_version ?? '-' },
                    { label: 'Z-Wave Version', key: (c: Controller) => c.zwave_version ?? '-' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-gray-50 odd:bg-gray-50/50">
                      <td className="p-4 font-medium text-gray-600 text-xs">{row.label}</td>
                      {compareControllers.map(c => (
                        <td key={c.id} className="p-4 text-center text-gray-700 text-xs">
                          {row.key(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => setCompareIds([])}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Clear selection
              </button>
              <button
                onClick={() => setShowCompare(false)}
                className="px-5 py-2 bg-[#2e6f40] text-white rounded-lg font-medium text-sm hover:bg-[#3d8b54]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HA Quick-Start Guide ──────────────────────────────────────── */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choosing the Right Coordinator for Home Assistant
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-amber-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">📡</span>
                <h3 className="font-bold text-gray-900">Starting with Zigbee?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Get the <strong>Sonoff ZBDongle-P</strong> or <strong>Home Assistant SkyConnect</strong>.
                Both are plug-and-play with ZHA. Use a USB extension cable to avoid WiFi interference.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• ZBDongle-P: Best range, most popular (~$20)</li>
                <li>• SkyConnect: Official HA + adds Thread support (~$30)</li>
                <li>• SLZB-06: Ethernet-based, place anywhere (~$60)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🔊</span>
                <h3 className="font-bold text-gray-900">Starting with Z-Wave?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Get the <strong>Aeotec Z-Stick 7 Plus</strong> or <strong>Zooz ZST10</strong>.
                Use Z-Wave JS integration in HA. Z-Wave JS UI add-on recommended for full features.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Aeotec Z-Stick 7 Plus: Most popular, proven (~$50)</li>
                <li>• Zooz ZST10: Best value, 700 series (~$35)</li>
                <li>• Zooz ZST39: Latest 800 series with Long Range (~$40)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-purple-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🧵</span>
                <h3 className="font-bold text-gray-900">Want Thread/Matter?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                The <strong>Home Assistant SkyConnect</strong> handles Zigbee + Thread + Matter in one stick.
                Alternatively, a HomePod mini or Echo 4th gen also provides Thread Border Routing.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• SkyConnect: Zigbee + Thread in one USB stick (~$30)</li>
                <li>• HomePod mini: Thread BR + HomeKit hub (~$99)</li>
                <li>• Echo 4th gen: Zigbee + Thread + Matter (~$100)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-[#d1ecd7] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-[#f0f9f2] rounded-xl flex items-center justify-center text-xl">🔀</span>
                <h3 className="font-bold text-gray-900">Want Zigbee + Z-Wave?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Get a dedicated coordinator for each. The <strong>Nortek HUSBZB-1</strong> does
                both in one USB stick, but newer alternatives offer better chipsets.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• HUSBZB-1: Both in one dongle (~$70, older chipsets)</li>
                <li>• ZBDongle-P + Zooz ZST10: Two dongles, best chipsets</li>
                <li>• Hubitat C-8: All-in-one hub alternative</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #2e6f40 0%, #3d8b54 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Check Device Compatibility?</h2>
          <p className="text-[#a3d9b0] mb-6">
            Once you have a coordinator, check which Zigbee and Z-Wave devices work best with Home Assistant.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#2e6f40] rounded-xl font-semibold hover:bg-[#f0f9f2] transition-colors"
            >
              Browse Compatible Devices
            </Link>
            <Link
              href="/getting-started"
              className="inline-flex items-center justify-center px-6 py-3 bg-transparent text-white rounded-xl font-semibold border-2 border-white hover:bg-white/10 transition-colors"
            >
              Getting Started Guide
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
