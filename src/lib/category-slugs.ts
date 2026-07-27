/**
 * Beginner-facing device category cards (homepage + compatibility deep links).
 * `dbCategories` is the literal products.category value(s) each card counts
 * and filters against — the single source of truth shared by
 * DeviceCategoryShowcase (counts/cards) and the compatibility page (`?category=`
 * URL param filtering), so a card's advertised count always matches what
 * loading that filter actually returns.
 *
 * 'locks' intentionally maps to a category that doesn't exist in the data
 * (locks are products.category = 'Security', type = 'smart_lock' — there's no
 * distinct "Locks" category yet). That's real: it lets the zero-curated-count
 * handling hide the card honestly instead of duplicating Security's count.
 */

export interface CategorySlug {
  slug: string;
  title: string;
  subtitle: string;
  imageType: string;
  dbCategories: string[];
}

export const CATEGORY_SLUGS: CategorySlug[] = [
  { slug: 'lighting',       title: 'Smart Lighting',  subtitle: 'Bulbs, strips, fixtures', imageType: 'smart-bulb', dbCategories: ['Lighting'] },
  { slug: 'security',       title: 'Security',        subtitle: 'Cameras, locks, sensors', imageType: 'camera',     dbCategories: ['Security'] },
  { slug: 'outlets-plugs',  title: 'Smart Plugs',     subtitle: 'Outlets & power strips',  imageType: 'smart-plug', dbCategories: ['Outlets & Plugs'] },
  { slug: 'climate',        title: 'Climate Control', subtitle: 'Thermostats, HVAC',       imageType: 'thermostat', dbCategories: ['Climate Control'] },
  { slug: 'sensors',        title: 'Sensors',         subtitle: 'Motion, door, temp',      imageType: 'sensor',     dbCategories: ['Sensors'] },
  { slug: 'switches',       title: 'Smart Switches',  subtitle: 'Wall switches, dimmers',  imageType: 'switch',     dbCategories: ['Switches'] },
  { slug: 'locks',          title: 'Smart Locks',     subtitle: 'Deadbolts, keypads',      imageType: 'smart-lock', dbCategories: ['Locks'] },
];
