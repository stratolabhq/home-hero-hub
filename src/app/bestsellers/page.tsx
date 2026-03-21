import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
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
  asin: string | null;
  ecosystems: Record<string, string>;
  last_updated: string | null;
}

async function getBestsellers(): Promise<BestsellerRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from('products')
    .select('id, name, brand, category, bestseller_rank, rating, review_count, price_range, image_url, asin, ecosystems, last_updated')
    .eq('is_bestseller', true)
    .not('bestseller_rank', 'is', null)
    .order('bestseller_rank')
    .limit(200);
  return (data as BestsellerRow[]) || [];
}

function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full  }).map((_, i) => <span key={`f${i}`} className="text-yellow-400 text-sm">★</span>)}
      {half                                      &&  <span className="text-yellow-400 text-sm">½</span>}
      {Array.from({ length: empty }).map((_, i) => <span key={`e${i}`} className="text-gray-300 text-sm">★</span>)}
    </div>
  );
}

function EcoBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
  );
}

export default async function BestsellersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params   = await searchParams;
  const all      = await getBestsellers();

  const categories = ['All', ...Array.from(new Set(all.map(p => p.category))).sort()];
  const activeCategory = params.category || 'All';
  const activeSort     = params.sort || 'rank';

  let products = activeCategory === 'All'
    ? all
    : all.filter(p => p.category === activeCategory);

  if (activeSort === 'rating') {
    products = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (activeSort === 'reviews') {
    products = [...products].sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0));
  }

  const lastUpdated = all[0]?.last_updated
    ? new Date(all[0].last_updated).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/" className="text-sm text-[#2e6f40] hover:text-[#1f4d2b] mb-4 inline-block">
            ← Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Amazon Best Sellers</h1>
          <p className="text-gray-600">
            The most popular smart home devices people are buying right now — updated daily
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">Last updated: {lastUpdated}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 flex-1">
            {categories.map(cat => (
              <Link
                key={cat}
                href={`/bestsellers?category=${encodeURIComponent(cat)}&sort=${activeSort}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#2e6f40] text-white border-[#2e6f40]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            {[
              { key: 'rank',    label: 'Best Rank' },
              { key: 'rating',  label: 'Top Rated' },
              { key: 'reviews', label: 'Most Reviews' },
            ].map(s => (
              <Link
                key={s.key}
                href={`/bestsellers?category=${encodeURIComponent(activeCategory)}&sort=${s.key}`}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  activeSort === s.key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <span className="text-sm text-gray-400 ml-auto">{products.length} products</span>
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No bestsellers loaded yet.{' '}
            <span className="block mt-2 text-sm">
              Run <code className="bg-gray-100 px-1 rounded">npx ts-node scripts/run-bestsellers.ts</code> to fetch data.
            </span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(product => {
              const amazonUrl = generateAmazonLink(product.name, product.brand);
              return (
                <div key={product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-50 rounded-t-xl overflow-hidden">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Rank badge */}
                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold shadow">
                      #{product.bestseller_rank}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs text-gray-400 mb-1">{product.brand}</p>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 flex-1">
                      {product.name}
                    </h3>

                    {/* Rating */}
                    {product.rating && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRating rating={product.rating} />
                        <span className="text-xs text-gray-500">
                          {product.rating.toFixed(1)}
                          {product.review_count && (
                            <span className="ml-1">({product.review_count.toLocaleString()})</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    {product.price_range && product.price_range !== 'Unknown' && (
                      <p className="text-sm font-bold text-gray-900 mb-3">{product.price_range}</p>
                    )}

                    {/* Ecosystem badges */}
                    {product.ecosystems && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.ecosystems.alexa === 'full' && (
                          <EcoBadge label="Alexa"  color="bg-blue-100 text-blue-700" />
                        )}
                        {product.ecosystems.google_home === 'full' && (
                          <EcoBadge label="Google" color="bg-red-100 text-red-700" />
                        )}
                        {product.ecosystems.apple_homekit === 'full' && (
                          <EcoBadge label="HomeKit" color="bg-gray-100 text-gray-700" />
                        )}
                        {product.ecosystems.matter === 'full' && (
                          <EcoBadge label="Matter" color="bg-purple-100 text-purple-700" />
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-50">
                      <a
                        href={amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-semibold text-[#FF9900] hover:text-[#e08000] transition-colors"
                      >
                        View on Amazon →
                      </a>
                      <Link
                        href={`/compatibility`}
                        className="text-xs text-[#2e6f40] hover:text-[#1f4d2b]"
                      >
                        Check compatibility
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
