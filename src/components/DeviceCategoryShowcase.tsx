'use client';

import Link from 'next/link';
import DeviceExampleImage from './DeviceExampleImage';

const CATEGORIES = [
  { type: 'smart-bulb',  title: 'Smart Lighting',   subtitle: 'Bulbs, strips, fixtures',  href: '/compatibility?category=lighting' },
  { type: 'camera',      title: 'Security',          subtitle: 'Cameras, locks, sensors',  href: '/compatibility?category=security' },
  { type: 'smart-plug',  title: 'Smart Plugs',       subtitle: 'Outlets & power strips',   href: '/compatibility?category=outlets-plugs' },
  { type: 'thermostat',  title: 'Climate Control',   subtitle: 'Thermostats, HVAC',        href: '/compatibility?category=climate' },
  { type: 'sensor',      title: 'Sensors',           subtitle: 'Motion, door, temp',       href: '/compatibility?category=sensors' },
  { type: 'switch',      title: 'Smart Switches',    subtitle: 'Wall switches, dimmers',   href: '/compatibility?category=switches' },
  { type: 'doorbell',    title: 'Doorbells',         subtitle: 'Video & smart doorbells',  href: '/compatibility?category=security' },
  { type: 'smart-lock',  title: 'Smart Locks',       subtitle: 'Deadbolts, keypads',       href: '/compatibility?category=locks' },
];

export default function DeviceCategoryShowcase() {
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
          {CATEGORIES.map(cat => (
            <Link key={cat.type} href={cat.href} className="group">
              {/* Image card */}
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-2.5 shadow-sm group-hover:shadow-md transition-shadow">
                {/* Device illustration fills the card */}
                <DeviceExampleImage
                  type={cat.type}
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
              <p className="text-center text-[#2e6f40] text-sm font-semibold group-hover:text-[#1f4d2b] transition-colors">
                Browse →
              </p>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/compatibility"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#2e6f40] text-white rounded-xl font-semibold hover:bg-[#3d8b54] transition-colors shadow-sm"
          >
            Browse All Devices
          </Link>
        </div>
      </div>
    </section>
  );
}
