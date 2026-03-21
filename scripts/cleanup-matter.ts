import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  notes: string | null;
}

interface CleanupStats {
  deletedApple: number;
  deletedQuectel: number;
  deletedNonConsumer: number;
  deletedWithinMatterDupes: number;
  htmlEntitiesFixed: number;
  categoriesFixed: number;
  brandsFixed: number;
  totalDeleted: number;
  remainingMatter: number;
  remainingTotal: number;
}

const stats: CleanupStats = {
  deletedApple: 0,
  deletedQuectel: 0,
  deletedNonConsumer: 0,
  deletedWithinMatterDupes: 0,
  htmlEntitiesFixed: 0,
  categoriesFixed: 0,
  brandsFixed: 0,
  totalDeleted: 0,
  remainingMatter: 0,
  remainingTotal: 0,
};

const deletedProducts: ProductRow[] = [];

// ─── Utilities ────────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#38;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function hasHtmlEntities(str: string | null): boolean {
  if (!str) return false;
  return /&#\d+;|&amp;|&quot;|&lt;|&gt;|&#39;/.test(str);
}

// Fetch all rows matching a query in paginated chunks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(query: () => any): Promise<ProductRow[]> {
  const results: ProductRow[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await query().range(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }
  return results;
}

// Delete rows by ID in chunks of 500
async function deleteByIds(ids: string[], label: string): Promise<number> {
  if (ids.length === 0) return 0;
  const chunkSize = 500;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase.from('products').delete().in('id', chunk);
    if (error) {
      console.error(`  [ERROR] deleting ${label} chunk: ${error.message}`);
    } else {
      deleted += chunk.length;
    }
  }
  return deleted;
}

// ─── Step 1: Delete Apple OS / platform entries ───────────────────────────────

async function deleteAppleOSEntries(): Promise<void> {
  console.log('\n[1/6] Deleting Apple OS/platform entries...');

  const rows = await fetchAll(() =>
    supabase.from('products').select('id,product_id,name,brand,category,notes').eq('brand', 'Apple Inc.')
  );

  const toDelete = rows.filter((r) => {
    const n = r.name.toLowerCase();
    return (
      n === 'ios' ||
      n === 'tvos' ||
      n === 'watchos' ||
      n === 'ipados' ||
      n === 'darwin' ||
      n === 'macos' ||
      n.includes('homepod software') ||
      n.includes("apple's platforms") ||
      n.includes('apple proprietary platforms')
    );
  });

  console.log(`  Found ${rows.length} Apple Inc. products, ${toDelete.length} are OS/platform entries`);

  deletedProducts.push(...toDelete);
  const count = await deleteByIds(toDelete.map((r) => r.id), 'Apple OS entries');
  stats.deletedApple = count;
  stats.totalDeleted += count;
  console.log(`  Deleted: ${count}`);
}

// ─── Step 2: Delete Quectel reference designs ─────────────────────────────────

async function deleteQuectelReferenceDesigns(): Promise<void> {
  console.log('\n[2/6] Deleting Quectel chip reference designs...');

  const rows = await fetchAll(() =>
    supabase.from('products').select('id,product_id,name,brand,category,notes').ilike('brand', '%quectel%')
  );

  // All Quectel entries are reference firmware variants — none are consumer products
  console.log(`  Found ${rows.length} Quectel products`);
  console.log(`  Product names: ${[...new Set(rows.map((r) => r.name))].join(', ')}`);

  deletedProducts.push(...rows);
  const count = await deleteByIds(rows.map((r) => r.id), 'Quectel reference designs');
  stats.deletedQuectel = count;
  stats.totalDeleted += count;
  console.log(`  Deleted: ${count}`);
}

// ─── Step 3: Delete other non-consumer entries ───────────────────────────────

async function deleteNonConsumerEntries(): Promise<void> {
  console.log('\n[3/6] Deleting other non-consumer/non-device entries...');

  // Fetch all matter products to scan
  const rows = await fetchAll(() =>
    supabase.from('products').select('id,product_id,name,brand,category,notes').like('product_id', 'matter-%')
  );

  const nonConsumerBrands = new Set([
    'Nordic Semiconductor ASA',
    'Bouffalo Lab (Nanjing) Co., Ltd.',
    'Beken Corporation',
    'Espressif Systems (Shanghai) Co., Ltd.',
    'Amlogic (Shanghai) Co., Ltd.',
    'Disign Incorporated',   // chip design company, not consumer brand
  ]);

  const nonConsumerNamePatterns = [
    /\bsdk\b/i,
    /development kit/i,
    /reference design/i,
    /\btest\b.*\bdevice\b/i,
    /\bdemo\b.*\bdevice\b/i,
    /nrf connect/i,
  ];

  const toDelete = rows.filter((r) => {
    if (nonConsumerBrands.has(r.brand)) return true;
    return nonConsumerNamePatterns.some((p) => p.test(r.name));
  });

  if (toDelete.length > 0) {
    console.log(`  Entries to remove:`);
    for (const r of toDelete) console.log(`    - [${r.brand}] ${r.name}`);
  } else {
    console.log('  None found.');
  }

  deletedProducts.push(...toDelete);
  const count = await deleteByIds(toDelete.map((r) => r.id), 'non-consumer entries');
  stats.deletedNonConsumer = count;
  stats.totalDeleted += count;
  console.log(`  Deleted: ${count}`);
}

// ─── Step 4: Deduplicate within Matter data ───────────────────────────────────

async function deduplicateWithinMatter(): Promise<void> {
  console.log('\n[4/6] Deduplicating within Matter products (same name+brand)...');

  const rows = await fetchAll(() =>
    supabase.from('products').select('id,product_id,name,brand,category,notes').like('product_id', 'matter-%')
  );

  console.log(`  Loaded ${rows.length} Matter products for dedup analysis`);

  // Group by name+brand
  const groups = new Map<string, ProductRow[]>();
  for (const r of rows) {
    const key = `${r.name}|||${r.brand}`;
    const g = groups.get(key) || [];
    g.push(r);
    groups.set(key, g);
  }

  const dupeGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`  Duplicate groups: ${dupeGroups.length}`);
  console.log(`  Total excess rows: ${dupeGroups.reduce((s, g) => s + g.length - 1, 0)}`);

  // For each group: keep the first row (lowest created_at / insertion order), delete the rest
  const toDeleteIds: string[] = [];
  const toDeleteRows: ProductRow[] = [];

  for (const group of dupeGroups) {
    // Sort by product_id alphabetically to get deterministic "keep" choice
    group.sort((a, b) => a.product_id.localeCompare(b.product_id));
    const [keep, ...rest] = group;
    void keep;
    toDeleteIds.push(...rest.map((r) => r.id));
    toDeleteRows.push(...rest);
  }

  deletedProducts.push(...toDeleteRows);
  const count = await deleteByIds(toDeleteIds, 'Matter duplicates');
  stats.deletedWithinMatterDupes = count;
  stats.totalDeleted += count;
  console.log(`  Deleted: ${count} duplicate rows`);
}

// ─── Step 5: Fix HTML entities in names and notes ────────────────────────────

async function fixHtmlEntities(): Promise<void> {
  console.log('\n[5/6] Fixing HTML entities in names and notes...');

  const rows = await fetchAll(() =>
    supabase.from('products').select('id,name,notes,brand').like('product_id', 'matter-%')
  );

  const toFix = rows.filter(
    (r) => hasHtmlEntities(r.name) || hasHtmlEntities(r.notes)
  );

  console.log(`  Found ${toFix.length} records with HTML entities`);

  let fixed = 0;
  const batchSize = 100;

  for (let i = 0; i < toFix.length; i += batchSize) {
    const batch = toFix.slice(i, i + batchSize);
    const pct = Math.round(((i + batch.length) / toFix.length) * 100);
    process.stdout.write(`  Fixing batch ${Math.floor(i / batchSize) + 1} [${pct}%] ... `);

    for (const row of batch) {
      const updates: Partial<{ name: string; notes: string; brand: string }> = {};

      if (hasHtmlEntities(row.name)) {
        updates.name = decodeHtmlEntities(row.name);
      }
      if (hasHtmlEntities(row.notes)) {
        updates.notes = decodeHtmlEntities(row.notes || '');
      }
      if (hasHtmlEntities(row.brand)) {
        updates.brand = decodeHtmlEntities(row.brand);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('products').update(updates).eq('id', row.id);
        if (!error) fixed++;
      }
    }
    console.log('done');
  }

  // Also fix brand names with &amp; across ALL products (not just matter)
  const { data: ampBrandRows } = await supabase
    .from('products')
    .select('id,brand')
    .ilike('brand', '%&amp;%');

  if (ampBrandRows && ampBrandRows.length > 0) {
    console.log(`  Fixing ${ampBrandRows.length} brand names with &amp; (all products)...`);
    for (const row of ampBrandRows) {
      await supabase
        .from('products')
        .update({ brand: decodeHtmlEntities(row.brand) })
        .eq('id', row.id);
      fixed++;
    }
  }

  stats.htmlEntitiesFixed = fixed;
  console.log(`  Fixed: ${fixed} records`);
}

// ─── Step 6: Fix category casing ─────────────────────────────────────────────

async function fixCategoryCasing(): Promise<void> {
  console.log('\n[6/6] Fixing category casing inconsistencies...');

  const categoryMap: Record<string, string> = {
    sensors:            'Sensors',
    lighting:           'Lighting',
    security:           'Security',
    switches:           'Switches',
    'climate control':  'Climate Control',
    climate:            'Climate Control',
    'outlets & plugs':  'Outlets & Plugs',
    'hubs & controllers': 'Hubs & Controllers',
    hubs:               'Hubs & Controllers',
    appliances:         'Appliances',
    other:              'Other',
    blinds:             'Other',
    accessories:        'Other',
  };

  let fixed = 0;
  for (const [badCat, goodCat] of Object.entries(categoryMap)) {
    const { data: rows } = await supabase
      .from('products')
      .select('id')
      .eq('category', badCat);

    if (rows && rows.length > 0) {
      const { error } = await supabase
        .from('products')
        .update({ category: goodCat })
        .eq('category', badCat);

      if (!error) {
        console.log(`  "${badCat}" → "${goodCat}" (${rows.length} records)`);
        fixed += rows.length;
      }
    }
  }

  stats.categoriesFixed = fixed;
  console.log(`  Total category fixes: ${fixed}`);
}

// ─── Final report ─────────────────────────────────────────────────────────────

async function generateReport(): Promise<void> {
  console.log('\nGenerating final report...');

  // Count remaining
  const { count: remainingTotal } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: remainingMatter } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .like('product_id', 'matter-%');

  stats.remainingTotal = remainingTotal || 0;
  stats.remainingMatter = remainingMatter || 0;

  // Category breakdown
  const { data: catData } = await supabase.from('products').select('category');
  const catCounts: Record<string, number> = {};
  for (const r of catData || []) catCounts[r.category] = (catCounts[r.category] || 0) + 1;

  // Brand count
  const { data: brandData } = await supabase.from('products').select('brand');
  const brandCounts: Record<string, number> = {};
  for (const r of brandData || []) brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;

  // Image counts
  const { count: noImageCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('image_url', '');

  const withImage = (remainingTotal || 0) - (noImageCount || 0);

  const catBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `  ${cat.padEnd(28)} ${count}`)
    .join('\n');

  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([brand, count]) => `  ${brand.padEnd(45)} ${count}`)
    .join('\n');

  const reportPath = path.join(process.cwd(), 'data', 'cleanup-summary.txt');
  const deletedPath = path.join(process.cwd(), 'data', 'deleted-products.txt');

  const report = `================================================================================
HOME HERO HUB — MATTER DATA CLEANUP SUMMARY
Date: ${new Date().toISOString().split('T')[0]}
================================================================================

DELETIONS
---------
Apple OS/platform entries deleted:    ${stats.deletedApple}
Quectel reference designs deleted:    ${stats.deletedQuectel}
Other non-consumer entries deleted:   ${stats.deletedNonConsumer}
Within-Matter duplicates removed:     ${stats.deletedWithinMatterDupes}
─────────────────────────────────────────
TOTAL DELETED:                         ${stats.totalDeleted}

FIXES APPLIED
-------------
HTML entities decoded:                ${stats.htmlEntitiesFixed} records
Category casing normalized:           ${stats.categoriesFixed} records

DATABASE STATE AFTER CLEANUP
-----------------------------
Total products remaining:             ${stats.remainingTotal}
Matter products remaining:            ${stats.remainingMatter}
Products with images:                 ${withImage}
Products without images:              ${noImageCount}
Unique brands:                        ${Object.keys(brandCounts).length}

PRODUCTS BY CATEGORY
--------------------
${catBreakdown}

TOP 20 BRANDS
-------------
${topBrands}

WHAT WAS DELETED AND WHY
-------------------------
1. Apple Inc. (${stats.deletedApple} entries)
   - iOS, tvOS, watchOS, iPadOS, macOS, Darwin, HomePod software
   - "Apple's Platforms", "Apple Proprietary Platforms"
   - These are Apple OS/platform Matter certifications, not physical devices

2. Quectel Wireless Solutions (${stats.deletedQuectel} entries)
   - On Off Light (×N), Extended Color Light (×N), Smart Window Covering (×N)
   - On/Off Plug-in Unit (×N), On/Off Light Switch (×N)
   - Quectel is a chip/module vendor; these entries are reference firmware
     running on their communication modules, not consumer products

3. Other non-consumer (${stats.deletedNonConsumer} entries)
   - Nordic Semiconductor: nRF Connect SDK, SDK test entries
   - Chip vendor SDKs and development kits

4. Within-Matter duplicates (${stats.deletedWithinMatterDupes} entries)
   - Same product name+brand with multiple CSA cert IDs (firmware revisions)
   - Kept one representative entry per unique name+brand combination

NOTES
-----
- No cross-scraper duplicates found (Kasa/Wyze/Philips Hue Matter entries
  use different brand names in CSA registry vs our scrapers, so no overlap)
- All Matter products still have empty image_url (CSA-IoT has no images)
- products table has no 'matter' boolean column; Matter products identified
  by product_id LIKE 'matter-%'
================================================================================
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nReport saved to: ${reportPath}`);

  // Save deleted products list
  const deletedText = [
    'DELETED PRODUCTS — HOME HERO HUB MATTER CLEANUP',
    `Date: ${new Date().toISOString().split('T')[0]}`,
    `Total: ${deletedProducts.length}`,
    '='.repeat(80),
    ...deletedProducts.map((p) => `[${p.brand}] ${p.name}  (id: ${p.id}, product_id: ${p.product_id})`),
  ].join('\n');

  fs.writeFileSync(deletedPath, deletedText, 'utf-8');
  console.log(`Deleted products list saved to: ${deletedPath}`);

  // Print summary to console
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Deleted total:        ${stats.totalDeleted}`);
  console.log(`  Apple OS entries:   ${stats.deletedApple}`);
  console.log(`  Quectel refs:       ${stats.deletedQuectel}`);
  console.log(`  Other non-consumer: ${stats.deletedNonConsumer}`);
  console.log(`  Matter dupes:       ${stats.deletedWithinMatterDupes}`);
  console.log(`HTML entities fixed:  ${stats.htmlEntitiesFixed}`);
  console.log(`Categories fixed:     ${stats.categoriesFixed}`);
  console.log(`─────────────────────────────────────`);
  console.log(`Remaining (total):    ${stats.remainingTotal}`);
  console.log(`Remaining (Matter):   ${stats.remainingMatter}`);
  console.log('='.repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const start = Date.now();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Matter Data Cleanup Script');
  console.log('='.repeat(60));

  // Count before
  const { count: beforeCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  console.log(`\nProducts before cleanup: ${beforeCount}`);

  await deleteAppleOSEntries();
  await deleteQuectelReferenceDesigns();
  await deleteNonConsumerEntries();
  await deduplicateWithinMatter();
  await fixHtmlEntities();
  await fixCategoryCasing();
  await generateReport();

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nTotal time: ${duration}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
