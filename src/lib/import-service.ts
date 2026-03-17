import { createClient } from '@supabase/supabase-js';
import { searchItems, PAAPISearchResult } from './amazon-pa-api';

const SEARCH_QUERIES = [
  'smart home hub',
  'smart light bulb zigbee',
  'smart plug wifi',
  'smart thermostat',
  'smart door lock',
  'smart security camera',
  'smart sensor motion door',
  'smart light switch',
];

interface ProductRecord {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: Record<string, string>;
  requires_hub: string;
  features: string[];
  notes: string;
  home_assistant: boolean;
  price_range: string;
  image_url: string;
}

interface ImportLogUpdate {
  status: 'completed' | 'failed';
  products_found: number;
  products_imported: number;
  products_updated: number;
  products_skipped: number;
  errors: { keyword?: string; message: string }[];
  duration_ms: number;
  completed_at: string;
}

export interface ImportResult {
  logId: string;
  status: 'completed' | 'failed';
  productsFound: number;
  productsImported: number;
  productsUpdated: number;
  productsSkipped: number;
  errors: { keyword?: string; message: string }[];
  durationMs: number;
}

// Keyword-based protocol/ecosystem detection from feature text
function detectProtocols(features: string[], title: string): string[] {
  const text = [...features, title].join(' ').toLowerCase();
  const protocols: string[] = [];
  if (/\bwi-?fi\b/.test(text)) protocols.push('WiFi');
  if (/\bzigbee\b/.test(text)) protocols.push('Zigbee');
  if (/\bz-?wave\b/.test(text)) protocols.push('Z-Wave');
  if (/\bbluetooth\b/.test(text)) protocols.push('Bluetooth');
  if (/\bmatter\b/.test(text)) protocols.push('Matter');
  if (/\bthread\b/.test(text)) protocols.push('Thread');
  if (/\bzwave\b/.test(text)) protocols.push('Z-Wave');
  return [...new Set(protocols)];
}

function detectEcosystems(features: string[], title: string): Record<string, string> {
  const text = [...features, title].join(' ').toLowerCase();
  const ecosystems: Record<string, string> = {};
  if (/\bamazon alexa\b|\bworks with alexa\b|\balexa\b/.test(text)) ecosystems.alexa = 'full';
  if (/\bgoogle home\b|\bgoogle assistant\b|\bworks with google\b/.test(text)) ecosystems.google_home = 'full';
  if (/\bapple homekit\b|\bhomekit\b/.test(text)) ecosystems.homekit = 'full';
  if (/\bsmartthings\b/.test(text)) ecosystems.smartthings = 'full';
  if (/\bmatter\b/.test(text)) ecosystems.matter = 'full';
  return ecosystems;
}

function detectCategory(features: string[], title: string, categories: string[]): string {
  const text = [...features, title, ...categories].join(' ').toLowerCase();
  if (/\bhub\b|\bbridge\b|\bgateway\b/.test(text)) return 'Hub';
  if (/\bbulb\b|\blight\b|\blamp\b|\bled\b/.test(text)) return 'Lighting';
  if (/\bplug\b|\boutlet\b/.test(text)) return 'Smart Plug';
  if (/\bthermostat\b/.test(text)) return 'Thermostat';
  if (/\block\b/.test(text)) return 'Lock';
  if (/\bcamera\b|\bdoorbell\b/.test(text)) return 'Camera';
  if (/\bsensor\b|\bmotion\b/.test(text)) return 'Sensor';
  if (/\bswitch\b/.test(text)) return 'Switch';
  if (/\bdisplay\b|\becho show\b/.test(text)) return 'Display';
  return 'Smart Home';
}

function detectRequiresHub(protocols: string[], features: string[], title: string): string {
  const text = [...features, title].join(' ').toLowerCase();
  if (protocols.includes('Thread') && !protocols.includes('WiFi')) return 'thread_border_router';
  if (protocols.includes('Zigbee') && !protocols.includes('WiFi') && !protocols.includes('Matter')) return 'true';
  if (protocols.includes('Z-Wave')) return 'true';
  if (/\brequires hub\b|\bneed.*hub\b/.test(text)) return 'true';
  return 'false';
}

function detectHomeAssistant(features: string[], title: string): boolean {
  const text = [...features, title].join(' ').toLowerCase();
  return /home.assistant|matter|zigbee|z-?wave/.test(text);
}

function toPriceRange(price?: number): string {
  if (!price) return 'Unknown';
  if (price < 20) return 'Under $20';
  if (price < 50) return '$20-$50';
  if (price < 100) return '$50-$100';
  if (price < 200) return '$100-$200';
  return '$200+';
}

function toProductId(asin: string, brand: string, title: string): string {
  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `${brandSlug}-${titleSlug}-${asin}`.replace(/-+/g, '-');
}

function transformItem(item: PAAPISearchResult): ProductRecord {
  const protocols = detectProtocols(item.features ?? [], item.title);
  const ecosystems = detectEcosystems(item.features ?? [], item.title);
  const category = detectCategory(item.features ?? [], item.title, item.categories ?? []);
  const requiresHub = detectRequiresHub(protocols, item.features ?? [], item.title);
  const homeAssistant = detectHomeAssistant(item.features ?? [], item.title);

  return {
    product_id: toProductId(item.asin, item.brand, item.title),
    name: item.title.slice(0, 200),
    brand: item.brand || 'Unknown',
    category,
    type: category,
    protocols,
    ecosystems,
    requires_hub: requiresHub,
    features: (item.features ?? []).slice(0, 10),
    notes: `ASIN: ${item.asin}`,
    home_assistant: homeAssistant,
    price_range: toPriceRange(item.price),
    image_url: item.imageUrl ?? '',
  };
}

export async function runImport(
  trigger: 'manual' | 'cron',
  supabaseUrl: string,
  supabaseServiceKey: string,
  paAccessKey: string,
  paSecretKey: string,
  paPartnerTag: string
): Promise<ImportResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startedAt = Date.now();

  // Create initial log entry
  const { data: logData, error: logError } = await supabase
    .from('import_logs')
    .insert({
      trigger,
      status: 'running',
      keywords_searched: SEARCH_QUERIES,
      products_found: 0,
      products_imported: 0,
      products_updated: 0,
      products_skipped: 0,
      errors: [],
    })
    .select('id')
    .single();

  if (logError || !logData) {
    throw new Error(`Failed to create import log: ${logError?.message}`);
  }

  const logId: string = logData.id;
  const errors: { keyword?: string; message: string }[] = [];
  let productsFound = 0;
  let productsImported = 0;
  let productsUpdated = 0;
  let productsSkipped = 0;

  for (const keyword of SEARCH_QUERIES) {
    try {
      const items = await searchItems(keyword, paAccessKey, paSecretKey, paPartnerTag);
      productsFound += items.length;

      for (const item of items) {
        const product = transformItem(item);

        // Check if product already exists (by notes containing ASIN)
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('product_id', product.product_id)
          .maybeSingle();

        if (existing) {
          // Update image_url and price_range only
          const { error: updateErr } = await supabase
            .from('products')
            .update({ image_url: product.image_url, price_range: product.price_range })
            .eq('product_id', product.product_id);

          if (updateErr) {
            errors.push({ keyword, message: `Update ${product.product_id}: ${updateErr.message}` });
          } else {
            productsUpdated++;
          }
        } else {
          const { error: insertErr } = await supabase
            .from('products')
            .insert(product);

          if (insertErr) {
            if (insertErr.message.includes('duplicate')) {
              productsSkipped++;
            } else {
              errors.push({ keyword, message: `Insert ${product.product_id}: ${insertErr.message}` });
            }
          } else {
            productsImported++;
          }
        }
      }

      // Respect PA API rate limits (1 req/sec)
      await new Promise(r => setTimeout(r, 1100));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ keyword, message });
    }
  }

  const durationMs = Date.now() - startedAt;
  const finalStatus: 'completed' | 'failed' = errors.length > 0 && productsImported + productsUpdated === 0
    ? 'failed'
    : 'completed';

  const logUpdate: ImportLogUpdate = {
    status: finalStatus,
    products_found: productsFound,
    products_imported: productsImported,
    products_updated: productsUpdated,
    products_skipped: productsSkipped,
    errors,
    duration_ms: durationMs,
    completed_at: new Date().toISOString(),
  };

  await supabase.from('import_logs').update(logUpdate).eq('id', logId);

  return {
    logId,
    status: finalStatus,
    productsFound,
    productsImported,
    productsUpdated,
    productsSkipped,
    errors,
    durationMs,
  };
}
