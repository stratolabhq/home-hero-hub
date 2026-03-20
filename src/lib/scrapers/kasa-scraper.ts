import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KasaProduct {
  product_id: string;
  name: string;
  brand: 'TP-Link Kasa';
  category: string;
  type: string;
  protocols: ['WiFi'];
  ecosystems: {
    alexa: 'full';
    google_home: 'full';
    apple_homekit: 'none';
    smartthings: 'full';
    home_assistant: 'full';
  };
  requires_hub: false;
  hub_name: '';
  home_assistant: 'tplink';
  matter: boolean;
  image_url: string;
  price_range: string;
  description: string;
  model_number: string;
  features: string[];
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.kasasmart.com';
const MAX_RETRIES = 3;
const DELAY_MIN_MS = 1000;
const DELAY_MAX_MS = 2000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Category pages with their mapped category/type
const CATEGORY_PAGES: Array<{
  url: string;
  label: string;
  category: string;
  defaultType: string;
}> = [
  {
    url: `${BASE_URL}/us/products/smart-plugs`,
    label: 'smart-plugs',
    category: 'Outlets & Plugs',
    defaultType: 'Smart Plug',
  },
  {
    url: `${BASE_URL}/us/products/smart-lighting`,
    label: 'smart-lighting',
    category: 'Lighting',
    defaultType: 'Smart Bulb',
  },
  {
    url: `${BASE_URL}/us/products/smart-switches`,
    label: 'smart-switches',
    category: 'Switches',
    defaultType: 'Smart Switch',
  },
  {
    url: `${BASE_URL}/us/products/security-cameras`,
    label: 'security-cameras',
    category: 'Security',
    defaultType: 'Security Camera',
  },
];

// ─── Category / type inference ────────────────────────────────────────────────

function inferType(
  name: string,
  tags: string[],
  defaultType: string
): { category: string; type: string; matter: boolean } {
  const n = name.toLowerCase();
  const t = tags.map((x) => x.toLowerCase());
  const hasMatterTag = t.includes('matter');

  // Override category/type based on product name
  if (n.includes('power strip') || n.includes('powerstrip')) {
    return { category: 'Outlets & Plugs', type: 'Power Strip', matter: hasMatterTag };
  }
  if (n.includes('outdoor') && (n.includes('plug') || n.includes('outlet'))) {
    return { category: 'Outlets & Plugs', type: 'Outdoor Smart Plug', matter: hasMatterTag };
  }
  if (n.includes('light strip') || n.includes('lightstrip') || t.includes('light strip')) {
    return { category: 'Lighting', type: 'Light Strip', matter: hasMatterTag };
  }
  if (n.includes('multicolor') || t.includes('multicolor')) {
    return { category: 'Lighting', type: 'Smart Bulb (Color)', matter: hasMatterTag };
  }
  if (n.includes('dimmable') || t.includes('dimmable')) {
    return { category: 'Lighting', type: 'Smart Bulb (Dimmable)', matter: hasMatterTag };
  }
  if (n.includes('tunable') || t.includes('tunable white')) {
    return { category: 'Lighting', type: 'Smart Bulb (Tunable White)', matter: hasMatterTag };
  }
  if (n.includes('dimmer')) {
    return { category: 'Switches', type: 'Smart Dimmer Switch', matter: hasMatterTag };
  }
  if (n.includes('3-way') || n.includes('3 way')) {
    return { category: 'Switches', type: '3-Way Smart Switch', matter: hasMatterTag };
  }
  if (n.includes('doorbell')) {
    return { category: 'Security', type: 'Video Doorbell', matter: hasMatterTag };
  }
  if (n.includes('pan') || n.includes('tilt')) {
    return { category: 'Security', type: 'Pan/Tilt Camera', matter: hasMatterTag };
  }

  // Fallback: use the page-level default
  return { category: 'Outlets & Plugs', type: defaultType, matter: hasMatterTag };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(min = DELAY_MIN_MS, max = DELAY_MAX_MS): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bestImage($el: any, $: ReturnType<typeof cheerio.load>): string {
  void $; // unused but kept for consistent call signature
  const firstSource = $el.find('source').first();
  if (firstSource.length) {
    const srcset = firstSource.attr('srcset') || '';
    const first = srcset.split(',')[0].trim().split(' ')[0];
    if (first) return first;
  }
  return $el.find('img').attr('src') || '';
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === retries) {
        console.error(`  [FAIL] ${label} — gave up after ${retries} attempts: ${msg}`);
        return null;
      }
      console.warn(`  [RETRY ${attempt}/${retries}] ${label}: ${msg}`);
      await delay(2000, 4000);
    }
  }
  return null;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

function createClient(): AxiosInstance {
  return axios.create({
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 20000,
  });
}

// ─── Listing page scraping ────────────────────────────────────────────────────

interface ProductStub {
  url: string;
  name: string;
  modelNumber: string;
  imageUrl: string;
  tags: string[];
  categoryDefault: string;
  typeDefault: string;
}

async function fetchCategoryStubs(
  client: AxiosInstance,
  pageUrl: string,
  label: string,
  categoryDefault: string,
  typeDefault: string
): Promise<ProductStub[]> {
  const res = await client.get<string>(pageUrl);
  const $ = cheerio.load(res.data);
  const stubs: ProductStub[] = [];

  // Each product is a .product-tile div containing a .card anchor
  $('.product-tile').each((_, el) => {
    const $tile = $(el);

    // Skip "End of Life" products
    const snipe = $tile.find('.snipe').text().trim().toLowerCase();
    if (snipe.includes('end of life')) return;

    const $card = $tile.find('a.card');
    const href = $card.attr('href') || '';
    if (!href) return;

    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const name = $card.find('.prod-name').text().trim();
    const modelNumber = $card.find('.category').text().trim();

    // Parse data-tags JSON array (e.g. '["Matter","indoor plugs"]')
    let tags: string[] = [];
    try {
      const raw = $tile.attr('data-tags') || '[]';
      tags = JSON.parse(raw);
    } catch (_) {
      // ignore
    }

    const imageUrl = bestImage($card.find('picture'), $);

    if (name || url) {
      stubs.push({ url, name, modelNumber, imageUrl, tags, categoryDefault, typeDefault });
    }
  });

  return stubs;
}

// ─── Product detail page extraction ──────────────────────────────────────────

async function extractProductDetail(
  client: AxiosInstance,
  stub: ProductStub
): Promise<KasaProduct | null> {
  const res = await client.get<string>(stub.url);
  const $ = cheerio.load(res.data);

  // Name: prefer detail page h1, fall back to stub
  const name =
    $('h1.product-name, h1.title, h1').first().text().trim() ||
    stub.name ||
    $('meta[property="og:title"]').attr('content') ||
    '';

  if (!name) return null;

  const cleanName = name.replace(/\s+/g, ' ').trim();

  // Model: prefer meta / structured data / dedicated element, fall back to stub
  const modelNumber =
    stub.modelNumber ||
    $('[class*="model"], [class*="sku"], [data-model]').first().text().trim() ||
    '';

  // Description
  const description = (
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('.product-description, .description, [class*="desc"]').first().text().trim() ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  // Price — Kasa pages often don't show prices (sold on Amazon/retailers)
  const priceText =
    $('[class*="price"]').first().text().trim() ||
    $('meta[property="product:price:amount"]').attr('content') ||
    '';
  const priceMatch = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
  const priceRange = priceMatch ? priceMatch[0] : '';

  // Image: prefer detail page og:image (usually higher-res) > stub image
  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    stub.imageUrl ||
    $('picture source').first().attr('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
    $('img[src*="prismic"]').first().attr('src') ||
    '';

  // Features from bullet lists in product body
  const features: string[] = [];
  $('.product-features li, .features li, .highlights li, [class*="feature"] li, [class*="spec"] li').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text.length > 8 && text.length < 200) features.push(text);
  });
  const uniqueFeatures = [...new Set(features)].slice(0, 8);

  // Matter detection from page text + tags
  const pageText = $('body').text().toLowerCase();
  const hasMatterTag = stub.tags.map((t) => t.toLowerCase()).includes('matter');
  const matterInPage = /\bmatter\b/.test(pageText);
  const matter = hasMatterTag || matterInPage;

  // Category / type inference
  const { category, type } = inferType(cleanName, stub.tags, stub.typeDefault);

  // Use the URL slug as product_id — it's always unique per product page
  const urlSlug = stub.url.replace(/.*\/us\/products\//, '').replace(/\//g, '-');
  const product_id = `kasa-${urlSlug}`;

  return {
    product_id,
    name: cleanName,
    brand: 'TP-Link Kasa',
    category,
    type,
    protocols: ['WiFi'],
    ecosystems: {
      alexa: 'full',
      google_home: 'full',
      apple_homekit: 'none',
      smartthings: 'full',
      home_assistant: 'full',
    },
    requires_hub: false,
    hub_name: '',
    home_assistant: 'tplink',
    matter,
    image_url: imageUrl,
    price_range: priceRange,
    description,
    model_number: modelNumber,
    features: uniqueFeatures,
    notes: `Source: ${stub.url}`,
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapeKasa(): Promise<KasaProduct[]> {
  console.log('='.repeat(60));
  console.log('TP-Link Kasa Product Scraper (axios + cheerio)');
  console.log('='.repeat(60));

  const outputPath = path.join(process.cwd(), 'data', 'kasa-products.json');
  const client = createClient();

  // ── Step 1: Collect stubs from all category listing pages ─────────────────
  console.log('\n[1/2] Collecting products from category pages...');
  const allStubs = new Map<string, ProductStub>(); // keyed by URL for dedup

  for (const cat of CATEGORY_PAGES) {
    process.stdout.write(`  ${cat.label} ... `);

    const stubs = await withRetry(
      () => fetchCategoryStubs(client, cat.url, cat.label, cat.category, cat.defaultType),
      cat.label
    );

    if (stubs) {
      let added = 0;
      for (const stub of stubs) {
        if (!allStubs.has(stub.url)) {
          allStubs.set(stub.url, stub);
          added++;
        }
      }
      console.log(`${stubs.length} found (${added} unique)`);
    } else {
      console.log('failed');
    }

    await delay();
  }

  const stubList = [...allStubs.values()];
  console.log(`\n  Total unique product URLs: ${stubList.length}`);

  if (stubList.length === 0) {
    console.error('  No products found. Check the page structure.');
    return [];
  }

  // ── Step 2: Visit each product detail page ────────────────────────────────
  console.log('\n[2/2] Scraping product detail pages...');
  const allProducts: KasaProduct[] = [];

  for (let i = 0; i < stubList.length; i++) {
    const stub = stubList[i];
    const slug = stub.url.replace(`${BASE_URL}/us/products/`, '');
    process.stdout.write(`  [${i + 1}/${stubList.length}] ${slug} ... `);

    const product = await withRetry(() => extractProductDetail(client, stub), slug);

    if (product) {
      allProducts.push(product);
      console.log(`✓ ${product.type}${product.matter ? ' [Matter]' : ''} ${product.price_range}`);
    } else {
      console.log('✗ skipped');
    }

    await delay();
  }

  // ── Deduplicate by product_id (safety net) ────────────────────────────────
  const seen = new Set<string>();
  const dedupedProducts = allProducts.filter((p) => {
    if (seen.has(p.product_id)) return false;
    seen.add(p.product_id);
    return true;
  });

  if (dedupedProducts.length < allProducts.length) {
    console.log(`  Deduped: ${allProducts.length} → ${dedupedProducts.length} products`);
  }

  // ── Save results ──────────────────────────────────────────────────────────
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(dedupedProducts, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`Done. ${dedupedProducts.length} products saved to:`);
  console.log(`  ${outputPath}`);
  console.log('='.repeat(60) + '\n');

  return dedupedProducts;
}
