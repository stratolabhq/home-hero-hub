import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhilipsHueProduct {
  product_id: string;
  name: string;
  brand: 'Philips Hue';
  category: 'Lighting';
  type: string;
  protocols: ['Zigbee'];
  ecosystems: {
    alexa: 'full';
    google_home: 'full';
    apple_homekit: 'full';
    smartthings: 'full';
    matter: 'full' | 'none';
  };
  requires_hub: boolean;
  hub_name: string;
  home_assistant: 'full';
  matter: boolean;
  image_url: string;
  price_range: string;
  description: string;
  model_number: string;
  features: string[];
  notes: string;
}

interface JsonLdProduct {
  '@type': string;
  name?: string;
  productID?: string;
  gtin12?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  brand?: { name?: string };
  offers?: { price?: string; priceCurrency?: string };
}

interface JsonLdBreadcrumb {
  '@type': string;
  itemListElement?: Array<{ '@type': string; position?: number; item?: { name?: string } }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.philips-hue.com';
const ALL_PRODUCTS_URL = `${BASE_URL}/en-us/products/all-products`;
const MAX_RETRIES = 3;
const DELAY_MIN_MS = 1000;
const DELAY_MAX_MS = 2000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Products that don't need the Hue Bridge
const NO_BRIDGE_KEYWORDS = ['sync box', 'smart plug', 'bridge'];

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

function inferType(name: string, breadcrumbCategory: string): string {
  const n = name.toLowerCase();
  const c = breadcrumbCategory.toLowerCase();

  if (n.includes('sync box')) return 'HDMI Sync Box';
  if (n.includes('bridge')) return 'Hub';
  if (n.includes('smart plug')) return 'Smart Plug';
  if (n.includes('doorbell')) return 'Video Doorbell';
  if (n.includes('camera')) return 'Security Camera';
  if (n.includes('motion sensor') || n.includes('presence')) return 'Motion Sensor';
  if (n.includes('contact sensor')) return 'Contact Sensor';
  if (n.includes('tap dial') || n.includes('smart button') || n.includes('dimmer switch')) return 'Smart Control';
  if (n.includes('gradient') && n.includes('strip')) return 'Gradient Light Strip';
  if (n.includes('lightstrip') || n.includes('light strip') || n.includes('strip light')) return 'Light Strip';
  if (n.includes('flux')) return 'Light Strip';
  if (n.includes('go') && n.includes('portable')) return 'Portable Light';
  if (n.includes('bloom') || n.includes('iris') || n.includes('aura') || n.includes('lily')) return 'Accent Light';
  if (n.includes('outdoor') || c.includes('outdoor')) return 'Outdoor Light';
  if (n.includes('ceiling') || c.includes('ceiling')) return 'Ceiling Light';
  if (n.includes('floor lamp') || c.includes('floor lamp')) return 'Floor Lamp';
  if (n.includes('table lamp') || c.includes('table lamp')) return 'Table Lamp';
  if (n.includes('wall') && !n.includes('washer')) return 'Wall Light';
  if (n.includes('pendant') || n.includes('suspension')) return 'Pendant Light';
  if (n.includes('recessed') || n.includes('downlight')) return 'Downlight';
  if (n.includes('spotlight') || n.includes('spot')) return 'Spotlight';
  if (n.includes('signe') || n.includes('gradient lamp')) return 'Gradient Lamp';
  if (n.includes('perifo')) return 'Modular Track Light';
  if (c.includes('bulb') || n.includes('bulb') || n.includes('filament') || n.includes('lightguide')) return 'Smart Bulb';
  if (c.includes('strip') || c.includes('lightstrip')) return 'Light Strip';
  if (c.includes('lamp')) return 'Smart Lamp';
  if (c.includes('fixtures') || c.includes('luminaire')) return 'Light Fixture';
  return 'Smart Bulb';
}

function requiresHub(name: string): boolean {
  const n = name.toLowerCase();
  return !NO_BRIDGE_KEYWORDS.some((kw) => n.includes(kw));
}

function parsePriceRange(price: string | undefined, currency: string | undefined): string {
  if (!price) return '';
  const num = parseFloat(price);
  if (isNaN(num)) return '';
  const symbol = currency === 'USD' ? '$' : currency || '$';
  return `${symbol}${num.toFixed(2)}`;
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
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 20000,
  });
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

function extractJsonLd(html: string): { product: JsonLdProduct | null; breadcrumb: JsonLdBreadcrumb | null } {
  const $ = cheerio.load(html);
  let product: JsonLdProduct | null = null;
  let breadcrumb: JsonLdBreadcrumb | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type'] === 'Product') product = data as JsonLdProduct;
      if (data['@type'] === 'BreadcrumbList') breadcrumb = data as JsonLdBreadcrumb;
    } catch (_) {
      // malformed JSON-LD — skip
    }
  });

  return { product, breadcrumb };
}

function breadcrumbCategory(bc: JsonLdBreadcrumb | null): string {
  if (!bc?.itemListElement) return '';
  // Position 3 is typically the category (Home > Shop > Category > Product)
  const items = [...bc.itemListElement].sort((a, b) => (a.position || 0) - (b.position || 0));
  const categoryItem = items.find((i) => i.position === 3);
  return categoryItem?.item?.name || items[items.length - 2]?.item?.name || '';
}

// ─── Page fetching ────────────────────────────────────────────────────────────

async function fetchProductUrls(client: AxiosInstance, page: number): Promise<string[]> {
  const url = `${ALL_PRODUCTS_URL}?page=${page}`;
  const res = await client.get<string>(url);
  const html = res.data;
  const $ = cheerio.load(html);

  const urls = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('/en-us/p/')) return;
    const full = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    if (full.includes('philips-hue.com')) urls.add(full);
  });

  return [...urls];
}

async function discoverTotalPages(client: AxiosInstance): Promise<number> {
  const res = await client.get<string>(`${ALL_PRODUCTS_URL}?page=1`);
  const html = res.data;

  // Look for highest page number in pagination links
  const pageNums = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => parseInt(m[1], 10));
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}

// ─── Product detail extraction ────────────────────────────────────────────────

async function extractProduct(
  client: AxiosInstance,
  url: string
): Promise<PhilipsHueProduct | null> {
  const res = await client.get<string>(url);
  const html = res.data;

  const { product: ld, breadcrumb: bc } = extractJsonLd(html);
  if (!ld) return null;

  const name = ld.name || '';
  if (!name) return null;

  const catFromBreadcrumb = breadcrumbCategory(bc);
  const type = inferType(name, catFromBreadcrumb);
  const modelNumber = ld.productID || ld.gtin12 || '';
  const description = ld.description || '';
  const priceRange = parsePriceRange(ld.offers?.price, ld.offers?.priceCurrency);

  // First image from the array
  const images = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
  // Prefer higher-resolution by removing size constraints from URL
  const imageUrl = images[0]
    ? images[0].replace(/\?.*$/, '?wid=800&qlt=90')
    : '';

  // Matter detection from full page text
  const $ = cheerio.load(html);
  const pageText = $('body').text();
  const hasMatter = /\bmatter\b/i.test(pageText);

  // Features from description or spec lists
  const features: string[] = [];
  $('ul li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 200 && !text.includes('©') && !text.includes('cookie')) {
      features.push(text);
    }
  });
  // Deduplicate and cap
  const uniqueFeatures = [...new Set(features)].slice(0, 8);

  const needsBridge = requiresHub(name);
  const product_id = `philips-hue-${toSlug(name)}`;

  return {
    product_id,
    name: `Philips Hue ${name}`.replace('Philips Hue Philips Hue', 'Philips Hue').replace('Philips Hue Hue ', 'Philips Hue '),
    brand: 'Philips Hue',
    category: 'Lighting',
    type,
    protocols: ['Zigbee'],
    ecosystems: {
      alexa: 'full',
      google_home: 'full',
      apple_homekit: 'full',
      smartthings: 'full',
      matter: hasMatter ? 'full' : 'none',
    },
    requires_hub: needsBridge,
    hub_name: needsBridge ? 'Philips Hue Bridge' : '',
    home_assistant: 'full',
    matter: hasMatter,
    image_url: imageUrl,
    price_range: priceRange,
    description: description.slice(0, 500),
    model_number: modelNumber,
    features: uniqueFeatures,
    notes: `Source: ${url}`,
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapePhilipsHue(): Promise<PhilipsHueProduct[]> {
  console.log('='.repeat(60));
  console.log('Philips Hue Product Scraper (axios + cheerio)');
  console.log('='.repeat(60));

  const outputPath = path.join(process.cwd(), 'data', 'philips-hue-products.json');
  const client = createClient();
  const allProducts: PhilipsHueProduct[] = [];

  // ── Step 1: Discover total pages ─────────────────────────────────────────
  console.log('\n[1/3] Discovering pagination...');
  const totalPages = await withRetry(() => discoverTotalPages(client), 'discover pages') ?? 1;
  console.log(`  Total pages: ${totalPages}`);

  // ── Step 2: Collect all product URLs ─────────────────────────────────────
  console.log('\n[2/3] Collecting product URLs from listing pages...');
  const allUrls = new Set<string>();

  for (let page = 1; page <= totalPages; page++) {
    const urls = await withRetry(() => fetchProductUrls(client, page), `page ${page}`);
    if (urls) {
      urls.forEach((u) => allUrls.add(u));
      console.log(`  Page ${page}/${totalPages}: ${urls.length} links (total unique: ${allUrls.size})`);
    }
    await delay();
  }

  const urlList = [...allUrls];
  console.log(`\n  Total unique product URLs: ${urlList.length}`);

  // ── Step 3: Scrape each product detail page ───────────────────────────────
  console.log('\n[3/3] Scraping product detail pages...');

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    const label = url.split('/en-us/p/')[1] || url;
    process.stdout.write(`  [${i + 1}/${urlList.length}] ${label} ... `);

    const product = await withRetry(() => extractProduct(client, url), label);

    if (product) {
      allProducts.push(product);
      console.log(`✓ ${product.type} ${product.price_range}`);
    } else {
      console.log('✗ skipped');
    }

    await delay();
  }

  // ── Save results ──────────────────────────────────────────────────────────
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`Done. ${allProducts.length} products saved to:`);
  console.log(`  ${outputPath}`);
  console.log('='.repeat(60) + '\n');

  return allProducts;
}
