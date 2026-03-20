import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { MatterProduct } from '../src/lib/scrapers/matter-scraper';

// ─── Types ────────────────────────────────────────────────────────────────────

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

function toRow(p: MatterProduct): ProductRow {
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
    notes: [
      p.description && p.description !== 'Matter certified smart home device'
        ? `About: ${p.description.slice(0, 200)}`
        : '',
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

// ─── Setup ────────────────────────────────────────────────────────────────────

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_PATH = path.join(__dirname, '..', 'data', 'matter-products.json');
const BATCH_SIZE = 50;

export interface ImportResult {
  total: number;
  added: number;
  skipped: number;
  errors: number;
}

// ─── Import function ──────────────────────────────────────────────────────────

export async function importMatter(): Promise<ImportResult> {
  console.log('='.repeat(60));
  console.log('Matter Certified Devices Import — Supabase');
  console.log('='.repeat(60));

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`\nData file not found: ${DATA_PATH}`);
    console.error('Run the scraper first with: npx ts-node scripts/run-matter.ts');
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const products: MatterProduct[] = JSON.parse(raw);

  console.log(`\nTotal products in file: ${products.length}`);

  const result: ImportResult = { total: products.length, added: 0, skipped: 0, errors: 0 };

  // ── Step 1: Check which product_ids already exist ────────────────────────
  // Matter products span many brands so check by product_id prefix
  console.log('\nChecking for existing Matter records...');
  const existingIds = new Set<string>();

  // Fetch in batches since there could be thousands
  let offset = 0;
  const fetchBatch = 1000;
  while (true) {
    const { data: existing, error: fetchErr } = await supabase
      .from('products')
      .select('product_id')
      .like('product_id', 'matter-%')
      .range(offset, offset + fetchBatch - 1);

    if (fetchErr) {
      console.error('Failed to fetch existing products:', fetchErr.message);
      break;
    }
    if (!existing || existing.length === 0) break;
    for (const row of existing) existingIds.add(row.product_id);
    if (existing.length < fetchBatch) break;
    offset += fetchBatch;
  }

  console.log(`  ${existingIds.size} Matter products already in database`);

  // ── Step 2: Separate new vs existing ─────────────────────────────────────
  const newProducts: MatterProduct[] = [];
  let skipped = 0;

  for (const product of products) {
    if (existingIds.has(product.product_id)) {
      skipped++;
    } else {
      newProducts.push(product);
    }
  }

  result.skipped = skipped;
  console.log(`  New products to insert: ${newProducts.length}`);
  console.log(`  Duplicates to skip:     ${skipped}`);

  if (newProducts.length === 0) {
    console.log('\nNothing new to insert.');
    printSummary(result);
    return result;
  }

  // ── Step 3: Batch insert in chunks ───────────────────────────────────────
  console.log('\nInserting new products...');
  const rows = newProducts.map(toRow);
  const chunks: ProductRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    chunks.push(rows.slice(i, i + BATCH_SIZE));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const pct = Math.round(((ci + 1) / chunks.length) * 100);
    process.stdout.write(`  Batch ${ci + 1}/${chunks.length} (${chunk.length} records) [${pct}%] ... `);

    const { error: insertErr } = await supabase.from('products').insert(chunk);

    if (insertErr) {
      console.log('FAILED');
      console.error(`  [ERROR] Batch ${ci + 1}: ${insertErr.message}`);

      // Fall back to one-by-one
      for (const row of chunk) {
        try {
          const { error: singleErr } = await supabase.from('products').insert([row]);
          if (singleErr) {
            result.errors++;
          } else {
            result.added++;
          }
        } catch (err) {
          result.errors++;
        }
      }
    } else {
      console.log('OK');
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
