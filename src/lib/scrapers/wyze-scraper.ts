import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WyzeProduct {
  product_id: string;
  name: string;
  brand: 'Wyze';
  category: string;
  type: string;
  protocols: ['WiFi'];
  ecosystems: {
    alexa: 'full';
    google_home: 'full';
    apple_homekit: 'none';
    smartthings: 'none';
    home_assistant: 'full';
  };
  requires_hub: false;
  hub_name: '';
  home_assistant: 'wyze';
  matter: false;
  image_url: string;
  price_range: string;
  description: string;
  model_number: string;
  features: string[];
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.wyze.com';
const MAX_RETRIES = 3;

const CATEGORY_URLS: Record<string, string> = {
  cameras:          `${BASE_URL}/collections/cameras`,
  sensors:          `${BASE_URL}/collections/sensors`,
  lighting:         `${BASE_URL}/collections/lighting`,
  'plugs-switches': `${BASE_URL}/collections/plugs-switches`,
  'locks-access':   `${BASE_URL}/collections/locks-access`,
  thermostats:      `${BASE_URL}/collections/thermostats`,
  vacuums:          `${BASE_URL}/collections/vacuums`,
  outdoor:          `${BASE_URL}/collections/outdoor`,
};
const DELAY_MIN_MS = 1000;
const DELAY_MAX_MS = 2000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ─── Category mapping ─────────────────────────────────────────────────────────

function inferCategory(name: string): { category: string; type: string } {
  const n = name.toLowerCase();

  if (n.includes('cam') || n.includes('camera') || n.includes('doorbell') || n.includes('lock')) {
    const type = n.includes('doorbell')
      ? 'Video Doorbell'
      : n.includes('lock')
      ? 'Smart Lock'
      : n.includes('floodlight')
      ? 'Floodlight Camera'
      : 'Security Camera';
    return { category: 'Security', type };
  }

  if (n.includes('bulb') || n.includes('light strip') || n.includes('lightstrip') || n.includes('lamp')) {
    const type = n.includes('strip') ? 'Light Strip' : n.includes('lamp') ? 'Smart Lamp' : 'Smart Bulb';
    return { category: 'Lighting', type };
  }

  if (n.includes('plug') || n.includes('outlet')) {
    return { category: 'Outlets & Plugs', type: 'Smart Plug' };
  }

  if (n.includes('thermostat')) {
    return { category: 'Climate Control', type: 'Thermostat' };
  }

  if (
    n.includes('sense') ||
    n.includes('sensor') ||
    n.includes('motion') ||
    n.includes('contact') ||
    n.includes('leak') ||
    n.includes('climate')
  ) {
    const type = n.includes('motion')
      ? 'Motion Sensor'
      : n.includes('contact')
      ? 'Contact Sensor'
      : n.includes('leak')
      ? 'Leak Sensor'
      : n.includes('climate')
      ? 'Climate Sensor'
      : 'Sensor';
    return { category: 'Sensors', type };
  }

  if (n.includes('vacuum') || n.includes('robot')) {
    return { category: 'Appliances', type: 'Robot Vacuum' };
  }

  if (n.includes('hub') || n.includes('gateway') || n.includes('bridge')) {
    return { category: 'Hubs & Controllers', type: 'Smart Hub' };
  }

  if (n.includes('scale') || n.includes('watch') || n.includes('band') || n.includes('headphone')) {
    return { category: 'Other', type: 'Personal Device' };
  }

  return { category: 'Other', type: 'Smart Device' };
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

function parsePrice(text: string): string {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? match[0] : '';
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

// ─── Product URL discovery ────────────────────────────────────────────────────

function extractProductUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('/products/')) return;
    if (
      href === '/products' ||
      href.endsWith('/products') ||
      href.includes('?') ||
      href.includes('#') ||
      href.includes('/collections/')
    )
      return;

    const full = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    if (full.startsWith('https://www.wyze.com/products/')) {
      urls.add(full);
    }
  });

  return [...urls];
}

async function fetchCategoryUrls(
  client: AxiosInstance,
  categoryName: string,
  categoryUrl: string
): Promise<string[]> {
  console.log(`\n  Scraping category: ${categoryName}`);
  const urls: string[] = [];
  let page = 1;

  while (true) {
    const pageUrl = page === 1 ? categoryUrl : `${categoryUrl}?page=${page}`;
    const result = await withRetry(() => client.get<string>(pageUrl), `${categoryName} page ${page}`);
    if (!result) break;

    const pageUrls = extractProductUrls(result.data);
    if (pageUrls.length === 0) break;

    urls.push(...pageUrls);
    console.log(`    Page ${page}: ${pageUrls.length} products`);

    // Check if there's a next page
    const $ = cheerio.load(result.data);
    const hasNext =
      $('a[href*="?page="], a.next, [class*="next"]').length > 0 &&
      $(`a[href*="?page=${page + 1}"]`).length > 0;
    if (!hasNext) break;

    page++;
    await delay();
  }

  console.log(`  Found ${urls.length} products in category: ${categoryName}`);
  return urls;
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

interface JsonLdProduct {
  '@type': string;
  name?: string;
  sku?: string;
  mpn?: string;
  description?: string;
  image?: string | string[];
  offers?: {
    price?: string;
    priceCurrency?: string;
    lowPrice?: string;
    highPrice?: string;
  } | Array<{ price?: string; priceCurrency?: string }>;
}

function extractJsonLd(html: string): JsonLdProduct | null {
  const $ = cheerio.load(html);
  let product: JsonLdProduct | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type'] === 'Product') {
        product = data as JsonLdProduct;
        return false; // break
      }
      // Handle @graph arrays
      if (Array.isArray(data['@graph'])) {
        const found = data['@graph'].find((item: JsonLdProduct) => item['@type'] === 'Product');
        if (found) {
          product = found as JsonLdProduct;
          return false;
        }
      }
    } catch (_) {
      // malformed JSON-LD — skip
    }
  });

  return product;
}

function getPrice(ld: JsonLdProduct): string {
  const offers = ld.offers;
  if (!offers) return '';

  if (Array.isArray(offers)) {
    const prices = offers
      .map((o) => parseFloat(o.price || ''))
      .filter((p) => !isNaN(p));
    if (prices.length === 0) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }

  const single = offers as { price?: string; lowPrice?: string; highPrice?: string; priceCurrency?: string };
  if (single.lowPrice && single.highPrice) {
    return `$${parseFloat(single.lowPrice).toFixed(2)} – $${parseFloat(single.highPrice).toFixed(2)}`;
  }
  if (single.price) {
    const num = parseFloat(single.price);
    return isNaN(num) ? '' : `$${num.toFixed(2)}`;
  }
  return '';
}

function getImage(ld: JsonLdProduct): string {
  if (!ld.image) return '';
  const images = Array.isArray(ld.image) ? ld.image : [ld.image];
  return images[0] || '';
}

// ─── Product detail extraction ────────────────────────────────────────────────

async function extractProduct(
  client: AxiosInstance,
  url: string
): Promise<WyzeProduct | null> {
  const res = await client.get<string>(url);
  const html = res.data;
  const $ = cheerio.load(html);

  // Try JSON-LD first
  const ld = extractJsonLd(html);

  // Name: JSON-LD > og:title > h1
  const name =
    ld?.name ||
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    '';

  if (!name) return null;

  // Strip "Wyze" prefix duplication
  const cleanName = name.startsWith('Wyze ') ? name : `Wyze ${name}`;

  // Model / SKU
  const modelNumber =
    ld?.sku ||
    ld?.mpn ||
    $('[class*="sku"], [class*="model"], [data-sku]').first().text().trim() ||
    '';

  // Price
  let priceRange = ld ? getPrice(ld) : '';
  if (!priceRange) {
    // Fallback: look for price text in the page
    const priceText = $('[class*="price"]').first().text();
    priceRange = parsePrice(priceText);
  }

  // Image
  const imageUrl =
    (ld ? getImage(ld) : '') ||
    $('meta[property="og:image"]').attr('content') ||
    $('img[src*="wyze"]').first().attr('src') ||
    '';

  // Description
  const description = (
    ld?.description ||
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''
  ).slice(0, 500);

  // Features from bullet lists
  const features: string[] = [];
  $('ul li, [class*="feature"] li, [class*="spec"] li').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text.length > 8 && text.length < 200 && !text.includes('©') && !text.includes('cookie')) {
      features.push(text);
    }
  });
  const uniqueFeatures = [...new Set(features)].slice(0, 8);

  const { category, type } = inferCategory(cleanName);
  const product_id = `wyze-${toSlug(cleanName)}`;

  return {
    product_id,
    name: cleanName,
    brand: 'Wyze',
    category,
    type,
    protocols: ['WiFi'],
    ecosystems: {
      alexa: 'full',
      google_home: 'full',
      apple_homekit: 'none',
      smartthings: 'none',
      home_assistant: 'full',
    },
    requires_hub: false,
    hub_name: '',
    home_assistant: 'wyze',
    matter: false,
    image_url: imageUrl,
    price_range: priceRange,
    description,
    model_number: modelNumber,
    features: uniqueFeatures,
    notes: `Source: ${url}`,
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapeWyze(): Promise<WyzeProduct[]> {
  console.log('='.repeat(60));
  console.log('Wyze Product Scraper (axios + cheerio)');
  console.log('='.repeat(60));

  const outputPath = path.join(process.cwd(), 'data', 'wyze-products.json');
  const client = createClient();
  const allProducts: WyzeProduct[] = [];

  // ── Step 1: Collect product URLs from all categories ─────────────────────
  console.log('\n[1/2] Collecting product URLs from category pages...');
  const allUrls = new Set<string>();

  for (const [name, url] of Object.entries(CATEGORY_URLS)) {
    const categoryUrls = await fetchCategoryUrls(client, name, url);
    categoryUrls.forEach((u) => allUrls.add(u));
    await delay();
  }

  const urlList = [...allUrls];

  if (urlList.length === 0) {
    console.error('  No product URLs found. The page structure may have changed.');
    return [];
  }
  console.log(`\n  Total unique product URLs: ${urlList.length}`);

  // ── Step 2: Scrape each product detail page ───────────────────────────────
  console.log('\n[2/2] Scraping product detail pages...');

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    const slug = url.replace('https://www.wyze.com/products/', '');
    process.stdout.write(`  [${i + 1}/${urlList.length}] ${slug} ... `);

    const product = await withRetry(() => extractProduct(client, url), slug);

    if (product) {
      allProducts.push(product);
      console.log(`✓ ${product.category} — ${product.price_range || 'no price'}`);
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
