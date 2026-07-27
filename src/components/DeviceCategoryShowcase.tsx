'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DeviceExampleImage from './DeviceExampleImage';
import { CATEGORY_SLUGS } from '@/lib/category-slugs';

interface DeviceCategoryShowcaseProps {
  /** Live curated (is_popular) counts keyed by products.category, from getCuratedCategoryCounts(). */
  categoryCounts: Record<string, number>;
}

export default function DeviceCategoryShowcase({ categoryCounts }: DeviceCategoryShowcaseProps) {
  // Cards whose mapped category(ies) have zero curated products are hidden
  // rather than shown as "0 devices" — e.g. 'locks' has no distinct DB
  // category yet (locks live under Security), so it won't appear until
  // Phase 2 taxonomy cleanup gives it one.
  const cards = CATEGORY_SLUGS
    .map(cat => ({
      ...cat,
      count: cat.dbCategories.reduce((sum, dbCat) => sum + (categoryCounts[dbCat] ?? 0), 0),
    }))
    .filter(cat => cat.count > 0);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Discover Compatible Smart Home Devices
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Browse by device category to find products that work with your ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-10">
          {cards.map(cat => (
            <Link key={cat.slug} href={`/compatibility?category=${cat.slug}`} className="group">
              {/* Image card */}
              <div className="card-lift relative aspect-square rounded-2xl overflow-hidden mb-2.5 shadow-[var(--shadow-sm)]">
                {/* Device illustration fills the card */}
                <DeviceExampleImage
                  type={cat.imageType}
                  alt={cat.title}
                  className="absolute inset-0"
                />

                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                {/* Scale-on-hover overlay */}
                <div className="absolute inset-0 bg-[#2e6f40] opacity-0 group-hover:opacity-10 transition-opacity" />

                {/* Text */}
                <div className="absolute bottom-0 inset-x-0 p-3 md:p-4">
                  <h3 className="text-white font-bold text-sm md:text-base leading-tight drop-shadow">
                    {cat.title}
                  </h3>
                  <p className="text-white/75 text-xs mt-0.5 hidden sm:block leading-tight">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              {/* Browse link */}
              <p className="flex items-center justify-center gap-1 text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                {cat.count.toLocaleString()} devices
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/compatibility"
            className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-[var(--shadow-green)]"
          >
            Browse All Devices
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
