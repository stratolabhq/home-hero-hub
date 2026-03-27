import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// ─── Setup ────────────────────────────────────────────────────────────────────

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_PATH = path.join(__dirname, '..', 'data', 'protocol-controllers.json');
const BATCH_SIZE = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControllerEntry {
  product_id: string;
  name: string;
  brand: string;
  model_number?: string;
  category: string;
  type: string;
  subcategory?: string;
  protocols: string[];
  chipset?: string;
  connection_type?: string;
  max_devices?: number;
  ecosystems: Record<string, string>;
  requires_hub: boolean;
  home_assistant: string;
  ha_setup_difficulty?: string;
  ha_notes?: string;
  zigbee_version?: string | null;
  zwave_version?: string | null;
  thread_support?: boolean;
  features: string[];
  notes: string;
  price_range: string;
  image_url: string;
  is_popular: boolean;
  is_controller: boolean;
  recommended_for?: string[];
  pros?: string[];
  cons?: string[];
  tags?: string[];
}

interface ProductRow {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  subcategory: string | null;
  protocols: string[];
  chipset: string | null;
  connection_type: string | null;
  max_devices: number | null;
  ecosystems: Record<string, string>;
  requires_hub: boolean;
  home_assistant: string;
  ha_setup_difficulty: string | null;
  ha_notes: string | null;
  zigbee_version: string | null;
  zwave_version: string | null;
  thread_support: boolean;
  features: string[];
  notes: string;
  price_range: string;
  image_url: string;
  is_popular: boolean;
  is_controller: boolean;
  recommended_for: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  tags: string[] | null;
}

function toRow(c: ControllerEntry): ProductRow {
  return {
    product_id: c.product_id,
    name: c.name,
    brand: c.brand,
    category: c.category,
    type: c.type,
    subcategory: c.subcategory ?? null,
    protocols: c.protocols,
    chipset: c.chipset ?? null,
    connection_type: c.connection_type ?? null,
    max_devices: c.max_devices ?? null,
    ecosystems: c.ecosystems,
    requires_hub: c.requires_hub,
    home_assistant: c.home_assistant,
    ha_setup_difficulty: c.ha_setup_difficulty ?? null,
    ha_notes: c.ha_notes ?? null,
    zigbee_version: c.zigbee_version ?? null,
    zwave_version: c.zwave_version ?? null,
    thread_support: c.thread_support ?? false,
    features: c.features,
    notes: [
      c.model_number ? `Model: ${c.model_number}` : '',
      c.notes,
    ].filter(Boolean).join(' | ').slice(0, 1000),
    price_range: c.price_range,
    image_url: c.image_url,
    is_popular: c.is_popular,
    is_controller: c.is_controller,
    recommended_for: c.recommended_for ?? null,
    pros: c.pros ?? null,
    cons: c.cons ?? null,
    tags: c.tags ?? null,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function importControllers() {
  console.log('='.repeat(60));
  console.log('Protocol Controllers Import — Supabase');
  console.log('='.repeat(60));

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const controllers: ControllerEntry[] = JSON.parse(raw);
  console.log(`Loaded ${controllers.length} controllers from JSON\n`);

  let added = 0;
  let updated = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < controllers.length; i += BATCH_SIZE) {
    const batch = controllers.slice(i, i + BATCH_SIZE);
    const rows = batch.map(toRow);

    const { data, error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'product_id' })
      .select('product_id');

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      const count = data?.length ?? 0;
      added += count;
      console.log(`Batch ${i / BATCH_SIZE + 1}: upserted ${count} controllers`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results:`);
  console.log(`  Upserted: ${added}`);
  console.log(`  Errors:   ${errors}`);
  console.log('='.repeat(60));

  // Verify
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_controller', true);

  console.log(`\nTotal controllers in DB: ${count}`);
}

importControllers().catch(console.error);
