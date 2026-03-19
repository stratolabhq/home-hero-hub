import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { PhilipsHueProduct } from '../src/lib/scrapers/philips-hue-scraper';

// Only the columns that exist in the products table
interface ProductRow {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: Record<string, string>;
  requires_hub: boolean;
  features: string[];
  notes: string;
  home_assistant: string;
  price_range: string;
  image_url: string;
}

function toRow(p: PhilipsHueProduct): ProductRow {
  return {
    product_id: p.product_id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    type: p.type,
    protocols: p.protocols,
    ecosystems: p.ecosystems,
    requires_hub: p.requires_hub,
    features: p.features,
    // Merge description + model number into notes
    notes: [
      p.description ? `About: ${p.description.slice(0, 200)}` : '',
      p.model_number ? `Model: ${p.model_number}` : '',
      p.notes,
    ]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 500),
    home_assistant: p.home_assistant,
    price_range: p.price_range,
    image_url: p.image_url,
  };
}

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_PATH = path.join(__dirname, '..', 'data', 'philips-hue-products.json');
const BATCH_SIZE = 50;

export interface ImportResult {
  total: number;
  added: number;
  skipped: number;
  errors: number;
}

export async function importPhilipsHue(): Promise<ImportResult> {
  console.log('='.repeat(60));
  console.log('Philips Hue Import — Supabase');
  console.log('='.repeat(60));

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`\nData file not found: ${DATA_PATH}`);
    console.error('Run the scraper first with: npx ts-node scripts/run-philips-hue.ts');
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const products: PhilipsHueProduct[] = JSON.parse(raw);

  console.log(`\nTotal products in file: ${products.length}`);

  const result: ImportResult = { total: products.length, added: 0, skipped: 0, errors: 0 };

  // ── Step 1: Check which products already exist ───────────────────────────
  console.log('\nChecking for existing records...');
  const existingIds = new Set<string>();

  // Fetch all existing Philips Hue product_ids in one query
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('product_id')
    .eq('brand', 'Philips Hue');

  if (fetchErr) {
    console.error('Failed to fetch existing products:', fetchErr.message);
    // Continue anyway — we'll catch duplicate errors per row
  } else if (existing) {
    for (const row of existing) {
      existingIds.add(row.product_id);
    }
    console.log(`  ${existingIds.size} Philips Hue products already in database`);
  }

  // ── Step 2: Separate new vs existing ────────────────────────────────────
  const newProducts: PhilipsHueProduct[] = [];
  const skippedProducts: PhilipsHueProduct[] = [];

  for (const product of products) {
    if (existingIds.has(product.product_id)) {
      skippedProducts.push(product);
    } else {
      newProducts.push(product);
    }
  }

  result.skipped = skippedProducts.length;
  console.log(`  New products to insert: ${newProducts.length}`);
  console.log(`  Duplicates to skip:     ${skippedProducts.length}`);

  if (skippedProducts.length > 0) {
    console.log('\nSkipped (already exist):');
    for (const p of skippedProducts) {
      console.log(`  - ${p.name}`);
    }
  }

  if (newProducts.length === 0) {
    console.log('\nNothing new to insert.');
    printSummary(result);
    return result;
  }

  // ── Step 3: Batch insert in chunks of BATCH_SIZE ─────────────────────────
  console.log('\nInserting new products...');
  const rows = newProducts.map(toRow);
  const chunks: ProductRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    chunks.push(rows.slice(i, i + BATCH_SIZE));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    console.log(`  Batch ${ci + 1}/${chunks.length} (${chunk.length} records)...`);

    const { error: insertErr } = await supabase.from('products').insert(chunk);

    if (insertErr) {
      console.error(`  [ERROR] Batch ${ci + 1} failed: ${insertErr.message}`);

      // Fall back to inserting one-by-one so partial failures don't block the batch
      console.log('  Retrying batch one-by-one...');
      for (const row of chunk) {
        try {
          const { error: singleErr } = await supabase.from('products').insert([row]);
          if (singleErr) {
            console.error(`  [SKIP] ${row.name}: ${singleErr.message}`);
            result.errors++;
          } else {
            console.log(`  [OK] ${row.name}`);
            result.added++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  [SKIP] ${row.name}: ${msg}`);
          result.errors++;
        }
      }
    } else {
      console.log(`  Batch ${ci + 1} inserted successfully`);
      result.added += chunk.length;
    }
  }

  printSummary(result);
  return result;
}

function printSummary(result: ImportResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('Import Summary');
  console.log('='.repeat(60));
  console.log(`Total products found:  ${result.total}`);
  console.log(`New products added:    ${result.added}`);
  console.log(`Duplicates skipped:    ${result.skipped}`);
  console.log(`Errors:                ${result.errors}`);
  console.log('='.repeat(60) + '\n');
}
