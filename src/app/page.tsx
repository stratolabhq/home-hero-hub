import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Home as HomeIcon, CheckCircle, XCircle, Zap } from 'lucide-react';
import { generateAmazonLink } from '@/lib/amazon-affiliate';

interface BestsellerRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  bestseller_rank: number;
  rating: number | null;
  review_count: number | null;
  price_range: string | null;
  image_url: string | null;
  ecosystems: Record<string, string>;
}

async function getPageData(): Promise<{ popularCount: number; bestsellers: BestsellerRow[] }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [countRes, bestsellersRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_popular', true),
      supabase
        .from('products')
        .select('id, name, brand, category, bestseller_rank, rating, review_count, price_range, image_url, ecosystems')
        .eq('is_bestseller', true)
        .not('bestseller_rank', 'is', null)
        .order('bestseller_rank')
        .limit(12),
    ]);

    return {
      popularCount: countRes.count || 850,
      bestsellers:  (bestsellersRes.data as BestsellerRow[]) || [],
    };
  } catch {
    return { popularCount: 850, bestsellers: [] };
  }
}

export default async function Home() {
  const { popularCount, bestsellers } = await getPageData();

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#f0f9f2] to-[#d1ecd7] py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#a3d9b0] rounded-full text-sm font-medium text-[#1f4d2b] mb-8 shadow-sm">
            🌿 Smart Home, Naturally Connected
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Find Smart Home Devices That{' '}
            <span style={{
              background: 'linear-gradient(135deg, #2e6f40, #3d8b54)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Actually Work Together
            </span>
          </h1>

          <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
            Not sure if that smart bulb works with Alexa? We'll show you exactly
            which devices are compatible with your smart home ecosystem—before you buy.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-md"
            >
              How It Works
            </a>
            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2e6f40] rounded-xl font-semibold border-2 border-[#2e6f40] hover:bg-[#f0f9f2] transition-colors"
            >
              Browse Devices
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { value: `${popularCount.toLocaleString()}+`, label: 'Popular Devices' },
              { value: 'Free',   label: 'Always Free to Search' },
              { value: '6',     label: 'Ecosystems Tracked' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-[#d1ecd7]">
                <div className="text-3xl font-bold text-[#2e6f40] mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is a Smart Home? ─────────────────────────────────────── */}
      <section id="what-is-smart-home" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            New to Smart Homes? Start Here
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">
            Everything you need to know, explained in plain English.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#f0f9f2] border border-[#d1ecd7] rounded-full flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="w-8 h-8 text-[#2e6f40]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">What is a Smart Home?</h3>
              <p className="text-gray-600 leading-relaxed">
                A smart home uses internet-connected devices you can control with
                your phone or voice. Turn on lights, lock doors, adjust the
                temperature—from anywhere.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#f0f9f2] border border-[#d1ecd7] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#2e6f40]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Why Compatibility Matters</h3>
              <p className="text-gray-600 leading-relaxed">
                Not all smart devices work with all systems. We help you find
                devices that work with Alexa, Google Home, Apple HomeKit, or
                whatever you already have.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#f0f9f2] border border-[#d1ecd7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[#2e6f40]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">How We Help</h3>
              <p className="text-gray-600 leading-relaxed">
                Search any smart device and instantly see if it works with your
                voice assistant, smart hub, or home automation system—before you
                spend a dime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            How to Use Home Hero Hub
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Four simple steps to a smarter home.
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-[#2e6f40] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                1
              </div>
              <div className="bg-white rounded-xl p-6 flex-1 border border-[#d1ecd7] shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Ecosystem</h3>
                <p className="text-gray-600 mb-4">
                  Do you use Amazon Alexa, Google Home, or Apple HomeKit? Pick
                  what you have—or what you're thinking of getting.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Alexa</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Google Home</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Apple HomeKit</span>
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">Home Assistant</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-[#2e6f40] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                2
              </div>
              <div className="bg-white rounded-xl p-6 flex-1 border border-[#d1ecd7] shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search for Devices</h3>
                <p className="text-gray-600 mb-4">
                  Looking for smart bulbs? Security cameras? Door locks? Search
                  our database of {popularCount.toLocaleString()}+ popular smart home devices.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Try: smart bulb, door lock, thermostat…
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-[#2e6f40] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                3
              </div>
              <div className="bg-white rounded-xl p-6 flex-1 border border-[#d1ecd7] shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Check Compatibility</h3>
                <p className="text-gray-600 mb-4">
                  See instantly if a device works with your ecosystem. We show
                  exactly which voice assistants, protocols, and systems it supports.
                </p>
                <div className="bg-[#f0f9f2] border border-[#d1ecd7] rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#2e6f40] flex-shrink-0" />
                    <span className="text-sm text-gray-700">Works with Amazon Alexa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#2e6f40] flex-shrink-0" />
                    <span className="text-sm text-gray-700">Works with Google Home</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Not compatible with HomeKit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-[#2e6f40] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                4
              </div>
              <div className="bg-white rounded-xl p-6 flex-1 border border-[#d1ecd7] shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Buy with Confidence</h3>
                <p className="text-gray-600">
                  Once you've found compatible devices, buy them knowing they'll
                  work with your existing setup. No more guessing, no more returns.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-md"
            >
              Start Searching Devices
            </Link>
          </div>
        </div>
      </section>

      {/* ── Popular Ecosystems ────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Popular Smart Home Ecosystems
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Choose the system that works best for you—or use multiple.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Alexa */}
            <div className="group border-2 border-gray-100 rounded-xl overflow-hidden hover:border-[#2e6f40] hover:shadow-md transition-all">
              <div className="h-36 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-8 translate-y-8" />
                </div>
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white border-opacity-30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <span className="text-white text-xs font-bold tracking-wider uppercase opacity-90">Alexa</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Amazon Alexa</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Voice control with Echo devices. Largest selection of compatible products.
                </p>
                <Link href="/compatibility?ecosystem=alexa" className="text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                  Browse Alexa Devices →
                </Link>
              </div>
            </div>

            {/* Google */}
            <div className="group border-2 border-gray-100 rounded-xl overflow-hidden hover:border-[#2e6f40] hover:shadow-md transition-all">
              <div className="h-36 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-8 translate-y-8" />
                </div>
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white border-opacity-30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                    </svg>
                  </div>
                  <span className="text-white text-xs font-bold tracking-wider uppercase opacity-90">Google</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Google Home</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Google Assistant integration. Great with Android phones and Nest products.
                </p>
                <Link href="/compatibility?ecosystem=google_home" className="text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                  Browse Google Devices →
                </Link>
              </div>
            </div>

            {/* HomeKit */}
            <div className="group border-2 border-gray-100 rounded-xl overflow-hidden hover:border-[#2e6f40] hover:shadow-md transition-all">
              <div className="h-36 bg-gradient-to-br from-gray-600 to-gray-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-8 translate-y-8" />
                </div>
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white border-opacity-30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <span className="text-white text-xs font-bold tracking-wider uppercase opacity-90">HomeKit</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Apple HomeKit</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Siri voice control. Secure and private. Best for iPhone and iPad users.
                </p>
                <Link href="/compatibility?ecosystem=apple_homekit" className="text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                  Browse HomeKit Devices →
                </Link>
              </div>
            </div>

            {/* Home Assistant */}
            <div className="group border-2 border-gray-100 rounded-xl overflow-hidden hover:border-[#2e6f40] hover:shadow-md transition-all">
              <div className="h-36 bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-8 translate-y-8" />
                </div>
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white border-opacity-30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-white text-xs font-bold tracking-wider uppercase opacity-90">Home Assistant</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Home Assistant</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Advanced local automation. Works with almost everything. Great for tech-savvy users.
                </p>
                <Link href="/compatibility?ecosystem=home_assistant" className="text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                  Browse HA Devices →
                </Link>
              </div>
            </div>
          </div>

          {/* Device types teaser */}
          <div className="mt-12 bg-[#f0f9f2] border border-[#d1ecd7] rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Not sure what devices to buy?</h3>
              <p className="text-gray-600 text-sm max-w-lg">
                Our visual device guide breaks down smart bulbs, plugs, locks, thermostats, cameras, sensors,
                switches, and doorbells — with prices, brands, and buying tips.
              </p>
            </div>
            <Link
              href="/getting-started/device-types"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-sm whitespace-nowrap"
            >
              Browse Device Types →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Amazon Best Sellers ──────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold mb-3">
                <span>★</span> Amazon Best Sellers
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Most Popular Smart Home Devices
              </h2>
              <p className="text-gray-600">
                The top-selling devices people are buying right now
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {bestsellers.map(product => {
                const amazonUrl = generateAmazonLink(product.name, product.brand);
                return (
                  <div key={product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative aspect-square bg-gray-50 rounded-t-xl overflow-hidden">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain p-4"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold shadow">
                        #{product.bestseller_rank}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-xs text-gray-400 mb-1">{product.brand}</p>
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 flex-1">
                        {product.name}
                      </h3>

                      {product.rating && (
                        <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">
                          {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
                          <span className="text-gray-500 text-xs ml-1">{product.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {product.price_range && product.price_range !== 'Unknown' && (
                        <p className="text-sm font-bold text-gray-900 mb-2">{product.price_range}</p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.ecosystems?.alexa === 'full' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Alexa</span>
                        )}
                        {product.ecosystems?.google_home === 'full' && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Google</span>
                        )}
                        {product.ecosystems?.apple_homekit === 'full' && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">HomeKit</span>
                        )}
                      </div>

                      <a
                        href={amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto text-center text-xs font-semibold text-[#FF9900] hover:text-[#e08000] transition-colors border-t border-gray-50 pt-2"
                      >
                        View on Amazon →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/bestsellers"
                className="inline-flex items-center gap-2 text-[#2e6f40] font-semibold hover:text-[#1f4d2b] transition-colors"
              >
                View All Best Sellers →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Protocol Controllers ─────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-sm font-semibold mb-3">
              📡 Advanced Setup
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Protocol Controllers & Coordinators
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Essential hardware for Zigbee, Z-Wave, Matter, and Thread networks.
              Required for Home Assistant users building a local smart home.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="group bg-white rounded-xl border-2 border-amber-100 p-6 hover:border-amber-300 transition-colors">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 text-2xl">
                📡
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Zigbee Coordinators</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                USB sticks and Ethernet gateways for Zigbee device networks.
                Works with Home Assistant via ZHA or Zigbee2MQTT.
              </p>
              <Link href="/controllers?protocol=Zigbee" className="text-[#2e6f40] font-semibold text-sm group-hover:text-[#1f4d2b] transition-colors">
                Browse Zigbee Controllers →
              </Link>
            </div>

            <div className="group bg-white rounded-xl border-2 border-blue-100 p-6 hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-2xl">
                🔊
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Z-Wave Controllers</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                USB sticks for Z-Wave 700/800 series networks. Secure,
                interference-free mesh networking on 900 MHz.
              </p>
              <Link href="/controllers?protocol=Z-Wave" className="text-[#2e6f40] font-semibold text-sm group-hover:text-[#1f4d2b] transition-colors">
                Browse Z-Wave Controllers →
              </Link>
            </div>

            <div className="group bg-white rounded-xl border-2 border-purple-100 p-6 hover:border-purple-300 transition-colors">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-2xl">
                🧵
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Matter & Thread</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Border routers for Matter and Thread networks. Built into
                HomePod mini, Echo 4th gen, and Nest Hub 2nd gen.
              </p>
              <Link href="/controllers?protocol=Thread" className="text-[#2e6f40] font-semibold text-sm group-hover:text-[#1f4d2b] transition-colors">
                Browse Matter/Thread →
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/controllers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-sm"
            >
              View All Controllers & Coordinators
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything in One Place
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From checking compatibility to managing your full smart home
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-[#d1ecd7] hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#2e6f40] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Compatibility Checker</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Know before you buy. Check if products work together across all
                smart home protocols and ecosystems.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Inventory Manager</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Track all your smart devices in one place. See your full
                ecosystem at a glance.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#d1ecd7] hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-[#3d8b54] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI YAML Generator</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Describe automations in plain English and get ready-to-use
                Home Assistant YAML instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Community Requests</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Don't see your device? Request it. Help grow the database for
                everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Common questions from people just getting started.
          </p>

          <div className="space-y-4">
            {[
              {
                q: 'Do I need a hub for smart home devices?',
                a: 'It depends on the device. WiFi devices (like most smart plugs and bulbs) connect directly to your router—no hub needed. Zigbee and Z-Wave devices need a hub to work. On every device page, we tell you exactly which protocol it uses and whether a hub is required.',
              },
              {
                q: 'Can I mix Alexa and Google Home devices?',
                a: 'Absolutely! Many devices work with both ecosystems at the same time. Look for products that list multiple ecosystems in our compatibility checker. You can even control the same light bulb with both Alexa and Google Assistant.',
              },
              {
                q: "What's the difference between Zigbee, Z-Wave, and WiFi?",
                a: 'These are different ways smart devices talk to each other. WiFi connects directly to your router—easiest to set up. Zigbee and Z-Wave need a hub (like SmartThings or Philips Hue Bridge) but use less power and can create a mesh network for better reliability. We explain which protocol each device uses.',
              },
              {
                q: 'How do I get started with a smart home?',
                a: 'Start simple! Pick a voice assistant (Amazon Echo, Google Home, or Apple HomePod), then add a couple of smart bulbs or plugs that work with it. We recommend WiFi devices first—they\'re the easiest to set up with no extra hardware needed.',
              },
              {
                q: 'Is Home Hero Hub free to use?',
                a: 'Yes! Searching our database and checking compatibility is completely free. We earn a small commission when you buy through our Amazon links, which helps us keep the site running and the database up to date.',
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer font-semibold text-gray-900 hover:bg-[#f0f9f2] transition-colors list-none">
                  <span>{q}</span>
                  <svg
                    className="w-5 h-5 text-[#2e6f40] flex-shrink-0 ml-4 transition-transform group-open:rotate-180"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 pt-1 text-gray-600 leading-relaxed border-t border-gray-100">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #2e6f40 0%, #3d8b54 100%)' }}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Smart Home?
          </h2>
          <p className="text-lg text-[#a3d9b0] mb-8 max-w-xl mx-auto">
            Search {popularCount.toLocaleString()}+ devices and find out what works
            with your setup—free, no account needed.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2e6f40] rounded-xl font-bold hover:bg-[#f0f9f2] transition-colors shadow-lg"
            >
              Browse Devices Free
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white rounded-xl font-semibold border-2 border-white hover:bg-white/10 transition-colors"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2e6f40, #3d8b54)' }}>
                  <span className="text-white font-bold text-sm">H³</span>
                </div>
                <span className="text-lg font-bold">Home Hero Hub</span>
              </div>
              <p className="text-gray-400 text-sm">Your smart home compatibility guide</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/compatibility" className="hover:text-[#6fbf7d] transition">Compatibility</a></li>
                <li><a href="/controllers" className="hover:text-[#6fbf7d] transition">Controllers</a></li>
                <li><a href="/bestsellers" className="hover:text-[#6fbf7d] transition">Best Sellers</a></li>
                <li><a href="/tools/yaml-generator" className="hover:text-[#6fbf7d] transition">YAML Generator</a></li>
                <li><a href="/dashboard" className="hover:text-[#6fbf7d] transition">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-[#6fbf7d] transition">About</a></li>
                <li><a href="#what-is-smart-home" className="hover:text-[#6fbf7d] transition">Getting Started</a></li>
                <li><a href="/request-device" className="hover:text-[#6fbf7d] transition">Request Device</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-[#6fbf7d] transition">Privacy</a></li>
                <li><a href="#" className="hover:text-[#6fbf7d] transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Home Hero Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
