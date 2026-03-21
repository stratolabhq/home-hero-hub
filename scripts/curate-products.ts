import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Popular brand lists ───────────────────────────────────────────────────────

const POPULAR_BRANDS = new Set([
  // Major consumer brands
  'Philips Hue', 'Wyze', 'TP-Link', 'TP-Link Kasa', 'Kasa',
  'Ring', 'Nest', 'Google Nest', 'Google',
  'Arlo', 'Ecobee', 'August', 'Samsung SmartThings', 'Samsung',
  'Lutron', 'Sonoff', 'IKEA', 'IKEA Tradfri',
  'Aqara', 'Sengled', 'GE', 'Cync', 'GE Cync',
  'Leviton', 'Eufy', 'Chamberlain', 'MyQ',
  'Yale', 'Schlage',
  // Popular niche brands
  'Shelly', 'Meross', 'Govee', 'Nanoleaf', 'LIFX', 'Eve',
]);

const OBSCURE_BRANDS = new Set([
  'Quectel', 'Silicon Labs', 'Espressif', 'Nordic Semiconductor',
  'NXP', 'Texas Instruments', 'Realtek', 'MediaTek', 'Qualcomm',
  'Telink', 'Bouffalo Lab', 'ASR Microelectronics',
  'Senscomm Semiconductor Co., Ltd.',
  'Woan Technology (Shenzhen) Co., Ltd.',
]);

// Patterns for obscure brands (semiconductor/B2B companies)
const OBSCURE_BRAND_PATTERNS = [
  /semiconductor/i,
  /microelectronics/i,
  /\bIC\b/,
  /shenzhen.*co\.,?\s*ltd/i,
  /technology.*co\.,?\s*ltd/i,
  /electronics.*co\.,?\s*ltd/i,
  /industrial/i,
  /solutions.*inc/i,
];

const GENERIC_NAMES = new Set([
  'On Off Light', 'Extended Color Light', 'Smart Sensor',
  'Temperature Sensor', 'Motion Sensor', 'Door Sensor',
  'Smart Plug', 'Smart Switch', 'Color Light',
  'Dimmable Light', 'Color Temperature Light',
  'Window Covering', 'Door Lock',
]);

const OBSCURE_CATEGORIES = new Set([
  'Other', 'Development Kit', 'Module',
]);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  protocols: string[] | null;
  is_popular: boolean | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchAll(): Promise<ProductRow[]> {
  const results: ProductRow[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, category, image_url, protocols, is_popular')
      .range(offset, offset + batchSize - 1);

    if (error) throw new Error(`Fetch error: ${error.message}`);
    if (!data || data.length === 0) break;
    results.push(...(data as ProductRow[]));
    if (data.length < batchSize) break;
    offset += batchSize;
  }
  return results;
}

async function updateByIds(ids: string[], popular: boolean, label: string): Promise<number> {
  if (ids.length === 0) return 0;
  const chunkSize = 500;
  let updated = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('products')
      .update({ is_popular: popular })
      .in('id', chunk);

    if (error) {
      console.error(`  [ERROR] updating ${label} chunk ${i}: ${error.message}`);
    } else {
      updated += chunk.length;
    }
  }
  console.log(`  ✓ ${label}: ${updated} products ${popular ? 'marked popular' : 'marked not popular'}`);
  return updated;
}

// ─── Column check ──────────────────────────────────────────────────────────────

async function checkColumn(): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .select('is_popular')
    .limit(1);

  if (error && error.message.includes('column') && error.message.includes('is_popular')) {
    console.error('\n❌ Column "is_popular" does not exist yet.');
    console.error('\nPlease run the following SQL in the Supabase SQL Editor first:\n');
    console.error('  ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;');
    console.error('  CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products (is_popular);');
    console.error('\nThe migration file is at: supabase/migrations/004_add_is_popular.sql\n');
    return false;
  }
  return true;
}

// ─── Stats query ───────────────────────────────────────────────────────────────

async function fetchStats(): Promise<{
  total: number;
  popular: number;
  notPopular: number;
  byCategory: Array<{ category: string; total: number; popular: number; notPopular: number }>;
  topBrands: Array<{ brand: string; count: number }>;
}> {
  // Paginate to get all rows (Supabase default limit is 1000)
  const rows: Array<{ id: string; category: string; brand: string; is_popular: boolean | null }> = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, category, brand, is_popular').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as typeof rows));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const total = rows.length;
  const popular = rows.filter(r => r.is_popular === true).length;
  const notPopular = total - popular;

  // By category
  const catMap = new Map<string, { total: number; popular: number; notPopular: number }>();
  for (const r of rows) {
    const cat = r.category || 'Unknown';
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, popular: 0, notPopular: 0 });
    const entry = catMap.get(cat)!;
    entry.total++;
    if (r.is_popular) entry.popular++;
    else entry.notPopular++;
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.popular - a.popular);

  // Top popular brands
  const brandMap = new Map<string, number>();
  for (const r of rows.filter(r => r.is_popular)) {
    const brand = r.brand || 'Unknown';
    brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
  }
  const topBrands = Array.from(brandMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { total, popular, notPopular, byCategory, topBrands };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  HOME HERO HUB — Product Curation Script');
  console.log('='.repeat(60));

  // Check column exists
  console.log('\n[0/5] Checking is_popular column...');
  const columnOk = await checkColumn();
  if (!columnOk) process.exit(1);
  console.log('  ✓ Column exists');

  // Fetch all products
  console.log('\n[1/5] Fetching all products...');
  const products = await fetchAll();
  console.log(`  ✓ Loaded ${products.length} products`);

  // ── Phase 1: Mark everything as not popular by default ──
  console.log('\n[2/5] Resetting all products to is_popular = false...');
  const allIds = products.map(p => p.id);
  await updateByIds(allIds, false, 'all products (reset)');

  // ── Phase 2: Mark popular based on criteria ──
  console.log('\n[3/5] Marking popular products...');

  // Criterion 1: Popular brands (case-insensitive match)
  const fromPopularBrands = products.filter(p => {
    const brand = (p.brand || '').trim();
    // Exact match
    if (POPULAR_BRANDS.has(brand)) return true;
    // Prefix match (e.g. "TP-Link Kasa Smart" → "TP-Link Kasa")
    for (const known of POPULAR_BRANDS) {
      if (brand.toLowerCase().startsWith(known.toLowerCase())) return true;
      if (known.toLowerCase().startsWith(brand.toLowerCase()) && brand.length >= 3) return true;
    }
    return false;
  });
  await updateByIds(fromPopularBrands.map(p => p.id), true, 'popular brands');

  // Criterion 2: Has an image (more likely a real consumer product)
  const hasImage = products.filter(p => p.image_url && p.image_url.trim().length > 0);
  await updateByIds(hasImage.map(p => p.id), true, 'has image');

  // Criterion 3: Not a Matter-only device (original manual/scraper data has other protocols)
  const notMatterOnly = products.filter(p => {
    const protos = p.protocols || [];
    // Products with WiFi, Zigbee, Z-Wave, or Bluetooth are from manual/scraper data, not generic Matter entries
    return protos.some(pr => ['WiFi', 'Zigbee', 'Z-Wave', 'Bluetooth'].includes(pr));
  });
  await updateByIds(notMatterOnly.map(p => p.id), true, 'non-Matter-only (manual scraper data)');

  // ── Phase 3: Mark NOT popular for generic/obscure products ──
  console.log('\n[4/5] Filtering out generic/obscure products...');

  // Obscure brands (chip vendors, B2B, generic Asian manufacturers)
  const obscureBrandIds = products.filter(p => {
    const brand = p.brand || '';
    if (OBSCURE_BRANDS.has(brand)) return true;
    return OBSCURE_BRAND_PATTERNS.some(pat => pat.test(brand));
  }).map(p => p.id);
  await updateByIds(obscureBrandIds, false, 'obscure brands (chip vendors/B2B)');

  // Non-consumer categories
  const obscureCatIds = products.filter(p => OBSCURE_CATEGORIES.has(p.category || '')).map(p => p.id);
  await updateByIds(obscureCatIds, false, 'non-consumer categories');

  // Generic names (Matter-only devices with no image)
  const genericMatterIds = products.filter(p => {
    const protos = p.protocols || [];
    const isMatterOnly = protos.includes('Matter') && !protos.some(pr => ['WiFi', 'Zigbee', 'Z-Wave', 'Bluetooth'].includes(pr));
    return isMatterOnly &&
      !p.image_url &&
      (GENERIC_NAMES.has(p.name || '') ||
        (p.name || '').includes('Test') ||
        (p.name || '').includes('Demo') ||
        (p.name || '').includes('Sample') ||
        (p.name || '').includes('Reference'));
  }).map(p => p.id);
  await updateByIds(genericMatterIds, false, 'generic Matter-only names (no image)');

  // ── Phase 4: Generate stats ──
  console.log('\n[5/5] Generating statistics report...');
  const stats = await fetchStats();

  const lines: string[] = [
    '='.repeat(60),
    '  HOME HERO HUB — Product Curation Report',
    `  Generated: ${new Date().toISOString()}`,
    '='.repeat(60),
    '',
    '── SUMMARY ─────────────────────────────────────────────────',
    '',
    `  Total products:    ${stats.total.toLocaleString()}`,
    `  Popular products:  ${stats.popular.toLocaleString()} (${((stats.popular / stats.total) * 100).toFixed(1)}%)`,
    `  Obscure products:  ${stats.notPopular.toLocaleString()} (${((stats.notPopular / stats.total) * 100).toFixed(1)}%)`,
    '',
    '── BY CATEGORY ─────────────────────────────────────────────',
    '',
    `  ${'Category'.padEnd(30)} ${'Total'.padStart(7)} ${'Popular'.padStart(8)} ${'Obscure'.padStart(8)}`,
    `  ${'-'.repeat(57)}`,
    ...stats.byCategory.map(r =>
      `  ${r.category.padEnd(30)} ${String(r.total).padStart(7)} ${String(r.popular).padStart(8)} ${String(r.notPopular).padStart(8)}`
    ),
    '',
    '── TOP 20 POPULAR BRANDS ────────────────────────────────────',
    '',
    ...stats.topBrands.map((b, i) =>
      `  ${String(i + 1).padStart(2)}. ${b.brand.padEnd(30)} ${b.count} products`
    ),
    '',
    '── IMPACT SUMMARY ───────────────────────────────────────────',
    '',
    `  Before curation: ${stats.total.toLocaleString()} devices shown in search`,
    `  After curation:  ${stats.popular.toLocaleString()} devices shown by default`,
    `  Reduction:       ${stats.notPopular.toLocaleString()} obscure devices hidden (${((stats.notPopular / stats.total) * 100).toFixed(1)}% filtered)`,
    '',
    '  Popular = shown by default in search and compatibility checker',
    '  Obscure = still in database, admin can toggle, not shown by default',
    '',
    '='.repeat(60),
  ];

  const report = lines.join('\n');
  console.log('\n' + report);

  const reportPath = path.join(process.cwd(), 'data', 'curation-report.txt');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n✓ Report saved to ${reportPath}`);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
