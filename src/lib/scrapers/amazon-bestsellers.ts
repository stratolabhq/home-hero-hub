/**
 * Amazon Best Sellers Scraper
 *
 * Uses the Amazon Product Advertising API v5 (PA API) — NOT raw HTML scraping.
 * Raw scraping of Amazon violates their Terms of Service and robots.txt.
 * The PA API is the licensed, proper way to access this data.
 *
 * Strategy:
 *  1. GetBrowseNodes → TopSellers ASINs (up to 10 per node)
 *  2. GetItems → full product details for those ASINs (batched, max 10 per call)
 *  3. SearchItems (keyword) → supplement with broader coverage
 *  4. Deduplicate, rank, and save to data/amazon-bestsellers.json
 */

import { searchItems, getItems, getBrowseNodeTopSellers, PAAPISearchResult } from '../amazon-pa-api';

// ─── Category browse nodes ────────────────────────────────────────────────────

interface BrowseNodeConfig {
  ids: string[];
  label: string;
  category: string;
}

const BROWSE_NODES: BrowseNodeConfig[] = [
  { ids: ['6563140011'],   label: 'Smart Home',             category: 'Smart Home'     },
  { ids: ['6291371011'],   label: 'Smart Home Lighting',    category: 'Lighting'       },
  { ids: ['524136'],       label: 'Security Cameras',       category: 'Camera'         },
  { ids: ['495382'],       label: 'Smart Locks',            category: 'Lock'           },
  { ids: ['6563140011'],   label: 'Movers & Shakers',       category: 'Smart Home'     },
];

// Keyword searches to supplement browse node results
const KEYWORD_SEARCHES: Array<{ keyword: string; category: string; browseNodeId?: string }> = [
  { keyword: 'smart home hub bridge',          category: 'Hub'             },
  { keyword: 'smart thermostat',               category: 'Climate Control' },
  { keyword: 'smart plug outlet wifi',         category: 'Outlets & Plugs' },
  { keyword: 'smart light switch',             category: 'Switches'        },
  { keyword: 'smart doorbell camera',          category: 'Camera'          },
  { keyword: 'smart motion sensor zigbee',     category: 'Sensor'          },
];

// ─── Data types ───────────────────────────────────────────────────────────────

export interface BestsellerProduct {
  asin: string;
  name: string;
  brand: string;
  category: string;
  amazon_category: string;
  price?: number;
  price_range: string;
  rating?: number;
  review_count?: number;
  image_url: string;
  detail_page_url: string;
  protocols: string[];
  ecosystems: Record<string, string>;
  is_bestseller: true;
  bestseller_rank: number;
  last_updated: string;
}

// ─── Detection helpers (reuse logic from import-service) ─────────────────────

function detectProtocols(features: string[], title: string): string[] {
  const text = [...features, title].join(' ').toLowerCase();
  const protocols: string[] = [];
  if (/\bwi-?fi\b/.test(text))     protocols.push('WiFi');
  if (/\bzigbee\b/.test(text))     protocols.push('Zigbee');
  if (/\bz-?wave\b/.test(text))    protocols.push('Z-Wave');
  if (/\bbluetooth\b/.test(text))  protocols.push('Bluetooth');
  if (/\bmatter\b/.test(text))     protocols.push('Matter');
  if (/\bthread\b/.test(text))     protocols.push('Thread');
  return [...new Set(protocols)];
}

function detectEcosystems(features: string[], title: string): Record<string, string> {
  const text = [...features, title].join(' ').toLowerCase();
  const eco: Record<string, string> = {};
  if (/\balexa\b|\bworks with alexa\b/.test(text))              eco.alexa = 'full';
  if (/\bgoogle home\b|\bgoogle assistant\b/.test(text))        eco.google_home = 'full';
  if (/\bhomekit\b|\bapple home\b/.test(text))                  eco.apple_homekit = 'full';
  if (/\bsmartthings\b/.test(text))                             eco.smartthings = 'full';
  if (/\bmatter\b/.test(text))                                  eco.matter = 'full';
  return eco;
}

function toPriceRange(price?: number): string {
  if (!price) return 'Unknown';
  if (price < 20)  return 'Under $20';
  if (price < 50)  return '$20-$50';
  if (price < 100) return '$50-$100';
  if (price < 200) return '$100-$200';
  return '$200+';
}

function transformItem(
  item: PAAPISearchResult,
  category: string,
  amazonCategory: string,
  rank: number,
): BestsellerProduct {
  return {
    asin:            item.asin,
    name:            item.title.slice(0, 200),
    brand:           item.brand || 'Unknown',
    category,
    amazon_category: amazonCategory,
    price:           item.price,
    price_range:     toPriceRange(item.price),
    rating:          item.rating,
    review_count:    item.reviewCount,
    image_url:       item.imageUrl ?? '',
    detail_page_url: item.detailPageUrl ?? '',
    protocols:       detectProtocols(item.features ?? [], item.title),
    ecosystems:      detectEcosystems(item.features ?? [], item.title),
    is_bestseller:   true,
    bestseller_rank: rank,
    last_updated:    new Date().toISOString(),
  };
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeAmazonBestSellers(
  accessKey: string,
  secretKey: string,
  partnerTag: string,
): Promise<BestsellerProduct[]> {
  const seenAsins = new Set<string>();
  const allItems = new Map<string, BestsellerProduct>();
  let globalRank = 1;

  console.log('\n[1/3] Fetching top sellers from browse nodes...');

  // Phase 1: Browse node top sellers
  for (const node of BROWSE_NODES) {
    try {
      console.log(`  → ${node.label} (nodes: ${node.ids.join(', ')})`);
      const asins = await getBrowseNodeTopSellers(node.ids, accessKey, secretKey, partnerTag);
      console.log(`    Found ${asins.length} top seller ASINs`);

      // Fetch full product details in batches of 10
      const newAsins = asins.filter(a => !seenAsins.has(a));
      for (let i = 0; i < newAsins.length; i += 10) {
        const batch = newAsins.slice(i, i + 10);
        await sleep(1100); // Respect 1 req/sec PA API limit

        try {
          const products = await getItems(batch, accessKey, secretKey, partnerTag);
          for (const product of products) {
            if (!seenAsins.has(product.asin)) {
              seenAsins.add(product.asin);
              allItems.set(product.asin, transformItem(product, node.category, node.label, globalRank++));
            }
          }
          console.log(`    Fetched details for batch ${i / 10 + 1} (${products.length} items)`);
        } catch (err) {
          console.error(`    [WARN] GetItems batch failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } catch (err) {
      console.error(`  [WARN] Browse node ${node.label} failed: ${err instanceof Error ? err.message : err}`);
    }

    await sleep(1500); // Pause between node lookups
  }

  console.log(`\n[2/3] Running keyword searches for broader coverage...`);

  // Phase 2: Keyword searches
  for (const search of KEYWORD_SEARCHES) {
    try {
      console.log(`  → "${search.keyword}"`);
      await sleep(1200);

      const items = await searchItems(
        search.keyword,
        accessKey,
        secretKey,
        partnerTag,
        search.browseNodeId,
      );

      let added = 0;
      for (const item of items) {
        if (!seenAsins.has(item.asin)) {
          seenAsins.add(item.asin);
          allItems.set(item.asin, transformItem(item, search.category, search.keyword, globalRank++));
          added++;
        }
      }
      console.log(`    ${items.length} results, ${added} new`);
    } catch (err) {
      console.error(`  [WARN] Search "${search.keyword}" failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n[3/3] Finalizing...`);

  const results = Array.from(allItems.values());

  // Re-rank: put browse node results first (they're "truer" bestsellers)
  // then sort by original rank
  results.sort((a, b) => a.bestseller_rank - b.bestseller_rank);

  // Re-number 1..N
  results.forEach((r, i) => { r.bestseller_rank = i + 1; });

  console.log(`  ✓ Total unique bestseller products: ${results.length}`);

  return results;
}
