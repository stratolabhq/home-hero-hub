/**
 * Import Amazon bestsellers from data/amazon-bestsellers.json into Supabase.
 *
 * Usage: npx ts-node scripts/import-bestsellers.ts
 *
 * For each bestseller:
 *  - If ASIN already exists in DB → update rank, rating, review_count, is_bestseller, is_popular
 *  - If brand+name fuzzy match → update same fields + set asin
 *  - Otherwise → insert as new product
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { BestsellerProduct } from '../src/lib/scrapers/amazon-bestsellers';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toProductId(asin: string, brand: string, title: string): string {
  const b = brand.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const t = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `${b}-${t}-${asin}`.replace(/-+/g, '-');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Rough name similarity: true if >50% word overlap
function nameSimilar(a: string, b: string): boolean {
  const wordsA = new Set(slugify(a).split(' ').filter(w => w.length > 3));
  const wordsB = new Set(slugify(b).split(' ').filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size) >= 0.5;
}

interface ExistingProduct {
  id: string;
  asin: string | null;
  name: string;
  brand: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Amazon Bestsellers → Supabase Import');
  console.log('='.repeat(60));

  // Load JSON
  const filePath = path.join(process.cwd(), 'data', 'amazon-bestsellers.json');
  if (!fs.existsSync(filePath)) {
    console.error('\n❌ data/amazon-bestsellers.json not found.');
    console.error('Run: npx ts-node scripts/run-bestsellers.ts first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const bestsellers: BestsellerProduct[] = raw.products;
  console.log(`\nLoaded ${bestsellers.length} bestsellers from ${path.basename(filePath)}`);
  console.log(`Scraped at: ${raw.scraped_at}`);

  // Load all existing products (id, asin, name, brand) for matching
  console.log('\nLoading existing products from database...');
  const existingProducts: ExistingProduct[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, asin, name, brand')
      .range(offset, offset + 999);
    if (error) throw new Error(`Fetch error: ${error.message}`);
    if (!data || data.length === 0) break;
    existingProducts.push(...(data as ExistingProduct[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  ✓ Loaded ${existingProducts.length} existing products`);

  // Index by ASIN and name for fast lookup
  const byAsin   = new Map(existingProducts.filter(p => p.asin).map(p => [p.asin!, p]));
  const byBrand  = new Map<string, ExistingProduct[]>();
  for (const p of existingProducts) {
    const key = slugify(p.brand);
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key)!.push(p);
  }

  let matched  = 0;
  let inserted = 0;
  let errors   = 0;

  console.log('\nProcessing bestsellers...\n');

  for (const bs of bestsellers) {
    try {
      // 1. Match by ASIN (exact)
      let existing = byAsin.get(bs.asin) ?? null;

      // 2. Match by brand + name similarity
      if (!existing) {
        const brandKey = slugify(bs.brand);
        const sameBrand = byBrand.get(brandKey) ?? [];
        existing = sameBrand.find(p => nameSimilar(p.name, bs.name)) ?? null;
      }

      const updatePayload = {
        is_bestseller:   true,
        is_popular:      true,
        bestseller_rank: bs.bestseller_rank,
        last_updated:    bs.last_updated,
        asin:            bs.asin,
        ...(bs.rating       !== undefined && { rating:       bs.rating }),
        ...(bs.review_count !== undefined && { review_count: bs.review_count }),
        ...(bs.image_url                  && { image_url:    bs.image_url }),
        ...(bs.price !== undefined        && { price_range:  bs.price_range }),
      };

      if (existing) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', existing.id);
        if (error) {
          console.error(`  [ERR] Update ${bs.asin}: ${error.message}`);
          errors++;
        } else {
          console.log(`  ✓ Updated  #${bs.bestseller_rank.toString().padStart(3)} ${bs.name.slice(0, 50)}`);
          matched++;
        }
      } else {
        // Insert new product
        const insertPayload = {
          product_id:      toProductId(bs.asin, bs.brand, bs.name),
          name:            bs.name,
          brand:           bs.brand,
          category:        bs.category,
          type:            bs.category,
          asin:            bs.asin,
          protocols:       bs.protocols,
          ecosystems:      bs.ecosystems,
          requires_hub:    'false',
          features:        [],
          notes:           `ASIN: ${bs.asin}`,
          home_assistant:  false,
          price_range:     bs.price_range,
          image_url:       bs.image_url || null,
          is_bestseller:   true,
          is_popular:      true,
          bestseller_rank: bs.bestseller_rank,
          last_updated:    bs.last_updated,
          ...(bs.rating       !== undefined && { rating:       bs.rating }),
          ...(bs.review_count !== undefined && { review_count: bs.review_count }),
        };

        const { error } = await supabase.from('products').insert(insertPayload);
        if (error) {
          if (error.message.includes('duplicate')) {
            console.log(`  ~ Skipped  #${bs.bestseller_rank.toString().padStart(3)} ${bs.name.slice(0, 50)} (duplicate)`);
          } else {
            console.error(`  [ERR] Insert ${bs.asin}: ${error.message}`);
            errors++;
          }
        } else {
          console.log(`  + Inserted #${bs.bestseller_rank.toString().padStart(3)} ${bs.name.slice(0, 50)}`);
          inserted++;
        }
      }
    } catch (err) {
      console.error(`  [ERR] ${bs.asin}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Import Complete');
  console.log('='.repeat(60));
  console.log(`  Matched existing products:  ${matched}`);
  console.log(`  New products inserted:      ${inserted}`);
  console.log(`  Errors:                     ${errors}`);
  console.log(`  Total bestsellers:          ${bestsellers.length}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
