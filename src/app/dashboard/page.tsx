'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ECOSYSTEM_COLORS: Record<string, string> = {
  alexa: '#00A8E1',
  google_home: '#4285F4',
  apple_homekit: '#000000',
  smartthings: '#15BFFD',
  matter: '#8B5CF6',
  home_assistant: '#03A9F4',
};

const PROTOCOL_COLORS: Record<string, string> = {
  WiFi: '#10B981',
  Zigbee: '#F59E0B',
  'Z-Wave': '#EF4444',
  Thread: '#8B5CF6',
  Matter: '#6366F1',
  Bluetooth: '#3B82F6',
};

interface UserProduct {
  id: string;
  room: string;
  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    protocols: string[];
    ecosystems: any;
    home_assistant: string;
    image_url: string;
    requires_hub: string;
    hub_name?: string;
  };
}

const NetworkDiagram = dynamic<{ userProducts: UserProduct[] }>(
  () => import('@/components/NetworkDiagram'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full bg-[#f0f9f2] rounded-xl border border-[#d1ecd7] flex items-center justify-center" style={{ height: 560 }}>
        <p className="text-[#3d8b54] text-sm">Loading network diagram...</p>
      </div>
    ),
  }
);

export default function Dashboard() {
  const router = useRouter();
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>('all');
  const [view, setView] = useState<'card' | 'network'>('card');

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
      .select(`
        id,
        room,
        products (
          id, name, brand, category, protocols,
          ecosystems, home_assistant, image_url,
          requires_hub, hub_name
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user products:', error);
    } else {
      setUserProducts((data as unknown as UserProduct[]) || []);
    }
    setLoading(false);
  };

  const { ecosystemStats, protocolCounts, categoryCounts } = useMemo(() => {
    const stats = {
      alexa: 0, google_home: 0, apple_homekit: 0,
      smartthings: 0, matter: 0, home_assistant: 0,
    };
    const protocols: Record<string, number> = {};
    const categories: Record<string, number> = {};

    for (const p of userProducts) {
      const eco = p.products.ecosystems;
      if (eco?.alexa === 'full') stats.alexa++;
      if (eco?.google_home === 'full') stats.google_home++;
      if (eco?.apple_homekit === 'full') stats.apple_homekit++;
      if (eco?.smartthings === 'full') stats.smartthings++;
      if (eco?.matter === 'full') stats.matter++;
      if (p.products.home_assistant === 'full') stats.home_assistant++;
      for (const protocol of p.products.protocols) {
        protocols[protocol] = (protocols[protocol] || 0) + 1;
      }
      categories[p.products.category] = (categories[p.products.category] || 0) + 1;
    }

    return { ecosystemStats: stats, protocolCounts: protocols, categoryCounts: categories };
  }, [userProducts]);

  const hubRequirements = useMemo(() => {
    const hubs: Record<string, string[]> = {};
    for (const p of userProducts) {
      const { requires_hub, hub_name, name } = p.products;
      if (!requires_hub || requires_hub === 'false') continue;
      const label = requires_hub === 'thread_border_router'
        ? 'Thread Border Router'
        : (hub_name || 'Hub Required');
      if (!hubs[label]) hubs[label] = [];
      hubs[label].push(name);
    }
    return hubs;
  }, [userProducts]);

  const filteredDevices = useMemo(() => {
    if (selectedEcosystem === 'all') return userProducts;
    return userProducts.filter(p =>
      p.products.ecosystems?.[selectedEcosystem] === 'full' ||
      (selectedEcosystem === 'home_assistant' && p.products.home_assistant === 'full')
    );
  }, [userProducts, selectedEcosystem]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Home Dashboard</h1>
            <p className="text-gray-600">Visual overview of your smart home ecosystem</p>
          </div>
          {!loading && userProducts.length > 0 && (
            <div className="flex bg-[#f0f9f2] rounded-lg p-1 gap-1 flex-shrink-0 border border-[#d1ecd7]">
              <button
                onClick={() => setView('card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'card'
                    ? 'bg-white shadow-sm text-[#2e6f40] border border-[#d1ecd7]'
                    : 'text-gray-500 hover:text-[#2e6f40]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Card View
              </button>
              <button
                onClick={() => setView('network')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'network'
                    ? 'bg-white shadow-sm text-[#2e6f40] border border-[#d1ecd7]'
                    : 'text-gray-500 hover:text-[#2e6f40]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Network View
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-[#2e6f40]">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading your smart home…
            </div>
          </Card>
        ) : userProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No devices yet</h3>
            <p className="text-gray-600 mb-6">
              Add some devices to see your smart home ecosystem visualization
            </p>
            <Button onClick={() => router.push('/add-product')} size="lg">
              Add Your First Device
            </Button>
          </Card>
        ) : (
          <>
            {view === 'network' ? (
              <div className="mb-8">
                <NetworkDiagram userProducts={userProducts} />
              </div>
            ) : (
              <>
                {/* Ecosystem Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  {Object.entries(ecosystemStats).map(([ecosystem, count]) => (
                    <StatsCard
                      key={ecosystem}
                      label={ecosystem.replace('_', ' ')}
                      value={count}
                      valueColor={ECOSYSTEM_COLORS[ecosystem] || '#6B7280'}
                      active={selectedEcosystem === ecosystem}
                      onClick={() => setSelectedEcosystem(selectedEcosystem === ecosystem ? 'all' : ecosystem)}
                    />
                  ))}
                </div>

                {/* Protocol Distribution */}
                <Card className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Protocol Distribution</h2>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(protocolCounts).map(([protocol, count]) => (
                      <div
                        key={protocol}
                        className="px-4 py-2 rounded-full text-white font-medium flex items-center gap-2"
                        style={{ backgroundColor: PROTOCOL_COLORS[protocol] || '#6B7280' }}
                      >
                        <span>{protocol}</span>
                        <span className="bg-white bg-opacity-30 px-2 py-0.5 rounded-full text-sm">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Category Breakdown */}
                <Card className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Device Categories</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(categoryCounts).map(([category, count]) => (
                      <div key={category} className="text-center p-4 bg-[#f0f9f2] rounded-xl border border-[#d1ecd7]">
                        <div className="text-2xl font-bold text-[#2e6f40]">{count}</div>
                        <div className="text-sm text-gray-600 capitalize mt-1">{category}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Device Card Grid */}
                <Card className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Device Cards</h2>
                    {selectedEcosystem !== 'all' && (
                      <button
                        onClick={() => setSelectedEcosystem('all')}
                        className="text-sm text-[#2e6f40] hover:text-[#1f4d2b] font-medium"
                      >
                        Show All Devices
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDevices.map((userProduct) => (
                      <div
                        key={userProduct.id}
                        className="border-2 border-gray-100 rounded-xl p-4 hover:border-[#a3d9b0] hover:shadow-sm transition-all bg-white"
                      >
                        {userProduct.products.image_url && (
                          <div className="mb-3 h-32 flex items-center justify-center bg-[#f0f9f2] rounded-lg overflow-hidden">
                            <img
                              src={userProduct.products.image_url}
                              alt={userProduct.products.name}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">
                          {userProduct.products.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{userProduct.products.brand}</p>
                        {userProduct.room && (
                          <div className="text-xs text-gray-500 mb-3">📍 {userProduct.room}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {userProduct.products.protocols.map(protocol => (
                            <span
                              key={protocol}
                              className="px-2 py-0.5 text-xs rounded text-white"
                              style={{ backgroundColor: PROTOCOL_COLORS[protocol] || '#6B7280' }}
                            >
                              {protocol}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          {userProduct.products.ecosystems?.alexa === 'full' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-blue-100 text-blue-800" title="Alexa">A</div>
                          )}
                          {userProduct.products.ecosystems?.google_home === 'full' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-red-100 text-red-800" title="Google Home">G</div>
                          )}
                          {userProduct.products.ecosystems?.apple_homekit === 'full' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-800" title="HomeKit">H</div>
                          )}
                          {userProduct.products.ecosystems?.matter === 'full' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-purple-100 text-purple-800" title="Matter">M</div>
                          )}
                          {userProduct.products.home_assistant === 'full' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-cyan-100 text-cyan-800" title="Home Assistant">HA</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* Hub Requirements */}
            {Object.keys(hubRequirements).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">⚠️ Hub Requirements</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Some of your devices require a hub or bridge to function.
                </p>
                <div className="space-y-3">
                  {Object.entries(hubRequirements).map(([hubLabel, devices]) => (
                    <div key={hubLabel} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-amber-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{devices.length}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{hubLabel}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Required by: {devices.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Home Insights */}
            <div className="bg-[#f0f9f2] border border-[#d1ecd7] rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">💡 Smart Home Insights</h2>
              <div className="space-y-2 text-sm text-gray-700">
                {ecosystemStats.matter > 0 && (
                  <p>✨ You have {ecosystemStats.matter} Matter devices — these work across all ecosystems!</p>
                )}
                {ecosystemStats.home_assistant > 0 && (
                  <p>🏠 {ecosystemStats.home_assistant} devices support Home Assistant for advanced automation</p>
                )}
                {Object.keys(protocolCounts).length > 3 && (
                  <p>⚠️ You're using {Object.keys(protocolCounts).length} different protocols — consider consolidating for better reliability</p>
                )}
                {userProducts.length >= 10 && (
                  <p>🎉 Great progress! You have {userProducts.length} devices in your smart home</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
