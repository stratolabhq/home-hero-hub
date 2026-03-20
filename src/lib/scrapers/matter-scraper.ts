import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatterProduct {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: {
    alexa: 'full';
    google_home: 'full';
    apple_homekit: 'full';
    smartthings: 'full';
    home_assistant: 'full';
  };
  requires_hub: false;
  hub_name: '';
  home_assistant: 'matter';
  matter: true;
  image_url: string;
  price_range: '';
  description: string;
  model_number: string;
  features: string[];
  notes: string;
}

// WordPress REST API types
interface WpProduct {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  product_company: number[];
  product_device_type: number[];
  product_category: number[];
  acf?: {
    certificate_id?: string;
    product_id?: string;
    firmware_version?: string;
    hardware_version?: string;
    transport_interface?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; taxonomy: string }>>;
  };
}

interface WpTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://csa-iot.org';
const API_BASE = `${BASE_URL}/wp-json/wp/v2`;
const MAX_RETRIES = 3;
const DELAY_MIN_MS = 500;
const DELAY_MAX_MS = 1200;
const PER_PAGE = 100;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ─── Device type → category/type mapping ─────────────────────────────────────

function mapDeviceType(deviceTypeName: string): { category: string; type: string; protocols: string[] } {
  const d = deviceTypeName.toLowerCase();

  // Lighting
  if (d.includes('light') || d.includes('bulb') || d.includes('luminaire') || d.includes('lamp')) {
    const type = d.includes('strip') || d.includes('linear')
      ? 'Light Strip'
      : d.includes('color') || d.includes('colour') || d.includes('extended color')
      ? 'Smart Bulb (Color)'
      : d.includes('dimmable')
      ? 'Smart Bulb (Dimmable)'
      : 'Smart Bulb';
    return { category: 'Lighting', type, protocols: ['Matter', 'Thread'] };
  }

  // Plugs / outlets
  if (d.includes('outlet') || d.includes('plug') || d.includes('socket') || d.includes('power strip')) {
    const type = d.includes('power strip') ? 'Power Strip' : 'Smart Plug';
    return { category: 'Outlets & Plugs', type, protocols: ['Matter', 'WiFi'] };
  }

  // Switches / dimmers
  if (d.includes('switch') || d.includes('dimmer')) {
    const type = d.includes('dimmer') ? 'Smart Dimmer Switch' : 'Smart Switch';
    return { category: 'Switches', type, protocols: ['Matter', 'Thread'] };
  }

  // Security
  if (d.includes('lock') || d.includes('door lock')) {
    return { category: 'Security', type: 'Smart Lock', protocols: ['Matter', 'Thread'] };
  }
  if (d.includes('camera') || d.includes('cam')) {
    return { category: 'Security', type: 'Security Camera', protocols: ['Matter', 'WiFi'] };
  }
  if (d.includes('doorbell')) {
    return { category: 'Security', type: 'Video Doorbell', protocols: ['Matter', 'WiFi'] };
  }
  if (d.includes('alarm') || d.includes('siren')) {
    return { category: 'Security', type: 'Smart Alarm', protocols: ['Matter', 'Thread'] };
  }

  // Sensors
  if (
    d.includes('sensor') ||
    d.includes('contact') ||
    d.includes('motion') ||
    d.includes('presence') ||
    d.includes('occupancy') ||
    d.includes('leak') ||
    d.includes('smoke') ||
    d.includes('co ') ||
    d.includes('co2') ||
    d.includes('air quality') ||
    d.includes('temperature') ||
    d.includes('humidity')
  ) {
    const type = d.includes('motion') || d.includes('occupancy') || d.includes('presence')
      ? 'Motion Sensor'
      : d.includes('contact') || d.includes('door') || d.includes('window')
      ? 'Contact Sensor'
      : d.includes('leak') || d.includes('water')
      ? 'Leak Sensor'
      : d.includes('smoke')
      ? 'Smoke Detector'
      : d.includes('temperature') || d.includes('humidity')
      ? 'Climate Sensor'
      : d.includes('air quality') || d.includes('co')
      ? 'Air Quality Sensor'
      : 'Sensor';
    return { category: 'Sensors', type, protocols: ['Matter', 'Thread'] };
  }

  // Climate
  if (d.includes('thermostat') || d.includes('hvac') || d.includes('heat') || d.includes('cool') || d.includes('fan')) {
    const type = d.includes('fan') ? 'Smart Fan' : 'Thermostat';
    return { category: 'Climate Control', type, protocols: ['Matter', 'WiFi'] };
  }

  // Hubs / bridges
  if (d.includes('bridge') || d.includes('hub') || d.includes('gateway') || d.includes('aggregator')) {
    return { category: 'Hubs & Controllers', type: 'Matter Bridge', protocols: ['Matter', 'Thread', 'WiFi'] };
  }

  // Blinds / shades
  if (d.includes('blind') || d.includes('shade') || d.includes('curtain') || d.includes('window covering')) {
    return { category: 'Other', type: 'Smart Blinds', protocols: ['Matter', 'Thread'] };
  }

  // Appliances
  if (d.includes('refrigerator') || d.includes('washer') || d.includes('dryer') || d.includes('dishwasher') ||
      d.includes('oven') || d.includes('microwave') || d.includes('robot') || d.includes('vacuum')) {
    return { category: 'Appliances', type: 'Smart Appliance', protocols: ['Matter', 'WiFi'] };
  }

  // Media
  if (d.includes('speaker') || d.includes('tv') || d.includes('display') || d.includes('media')) {
    return { category: 'Other', type: 'Smart Media Device', protocols: ['Matter', 'WiFi'] };
  }

  return { category: 'Other', type: deviceTypeName || 'Matter Device', protocols: ['Matter'] };
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000,
  });
}

// ─── Taxonomy fetching ────────────────────────────────────────────────────────

async function fetchAllTerms(
  client: AxiosInstance,
  taxonomy: string
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  let page = 1;

  while (true) {
    const url = `${API_BASE}/${taxonomy}?per_page=100&page=${page}`;
    const res = await withRetry<{ data: WpTerm[]; total: number }>(
      async () => {
        const r = await client.get<WpTerm[]>(url);
        const total = parseInt(r.headers['x-wp-totalpages'] || '1', 10);
        return { data: r.data, total };
      },
      `${taxonomy} page ${page}`
    );

    if (!res || res.data.length === 0) break;
    for (const term of res.data) map.set(term.id, term.name);
    if (page >= res.total) break;
    page++;
    await delay();
  }

  return map;
}

async function findMatterCategoryId(client: AxiosInstance): Promise<number | null> {
  const res = await withRetry(
    () => client.get<WpTerm[]>(`${API_BASE}/product_category?per_page=100`),
    'product_category terms'
  );
  if (!res) return null;

  const matterTerm = res.data.find(
    (t) => t.slug === 'matter' || t.name.toLowerCase() === 'matter'
  );
  return matterTerm?.id ?? null;
}

// ─── Products fetching ────────────────────────────────────────────────────────

interface FetchProductsOptions {
  categoryId: number;
  page: number;
}

interface ProductPage {
  products: WpProduct[];
  totalPages: number;
  total: number;
}

async function fetchProductPage(
  client: AxiosInstance,
  opts: FetchProductsOptions
): Promise<ProductPage | null> {
  const url =
    `${API_BASE}/product` +
    `?per_page=${PER_PAGE}` +
    `&page=${opts.page}` +
    `&product_category=${opts.categoryId}` +
    `&_embed=wp:featuredmedia,wp:term`;

  return withRetry(async () => {
    const res = await client.get<WpProduct[]>(url);
    const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
    const total = parseInt(res.headers['x-wp-total'] || '0', 10);
    return { products: res.data, totalPages, total };
  }, `products page ${opts.page}`);
}

// ─── Product transformation ───────────────────────────────────────────────────

function transformProduct(
  wp: WpProduct,
  companyMap: Map<number, string>,
  deviceTypeMap: Map<number, string>
): MatterProduct | null {
  const name = stripHtml(wp.title.rendered);
  if (!name) return null;

  // Brand from first company term
  const brand = wp.product_company.length > 0
    ? (companyMap.get(wp.product_company[0]) || 'Unknown')
    : 'Unknown';

  // Device type from first device_type term
  const deviceTypeName = wp.product_device_type.length > 0
    ? (deviceTypeMap.get(wp.product_device_type[0]) || '')
    : '';

  // Also check embedded terms if present
  const embeddedTerms = wp._embedded?.['wp:term']?.flat() || [];
  const embeddedDeviceType = embeddedTerms.find((t) => t.taxonomy === 'product_device_type');
  const resolvedDeviceType = embeddedDeviceType?.name || deviceTypeName;

  const { category, type, protocols } = mapDeviceType(resolvedDeviceType);

  // Image from embedded featured media
  const imageUrl = wp._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

  // Description from excerpt
  const description = stripHtml(wp.excerpt.rendered).slice(0, 500) ||
    'Matter certified smart home device';

  // Cert ID and model from ACF fields
  const certId = wp.acf?.certificate_id || wp.acf?.product_id || '';
  const modelNumber = wp.acf?.product_id || '';

  // Unique product_id: prefer cert ID, fall back to slug
  const product_id = certId
    ? `matter-${toSlug(certId)}`
    : `matter-${wp.slug}`;

  // Notes: include device type, cert ID, transport interface
  const noteParts: string[] = [];
  if (resolvedDeviceType) noteParts.push(`Device Type: ${resolvedDeviceType}`);
  if (certId) noteParts.push(`Cert ID: ${certId}`);
  if (wp.acf?.transport_interface) noteParts.push(`Transport: ${wp.acf.transport_interface}`);
  noteParts.push(`Source: ${BASE_URL}/csa-iot_products/?p_certificate=${certId || wp.slug}`);

  return {
    product_id,
    name,
    brand,
    category,
    type,
    protocols,
    ecosystems: {
      alexa: 'full',
      google_home: 'full',
      apple_homekit: 'full',
      smartthings: 'full',
      home_assistant: 'full',
    },
    requires_hub: false,
    hub_name: '',
    home_assistant: 'matter',
    matter: true,
    image_url: imageUrl,
    price_range: '',
    description,
    model_number: modelNumber,
    features: [],
    notes: noteParts.join(' | ').slice(0, 500),
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

export async function scrapeMatterDevices(): Promise<MatterProduct[]> {
  console.log('='.repeat(60));
  console.log('Matter Certified Device Scraper (CSA-IoT REST API)');
  console.log('='.repeat(60));

  const outputPath = path.join(process.cwd(), 'data', 'matter-products.json');
  const client = createClient();

  // ── Step 1: Find Matter category term ID ─────────────────────────────────
  console.log('\n[1/4] Finding Matter category term ID...');
  const matterCategoryId = await findMatterCategoryId(client);
  if (!matterCategoryId) {
    console.error('  Could not find Matter category. Aborting.');
    return [];
  }
  console.log(`  Matter category ID: ${matterCategoryId}`);

  // ── Step 2: Load taxonomy lookups ────────────────────────────────────────
  console.log('\n[2/4] Loading taxonomy lookups (companies + device types)...');

  const [companyMap, deviceTypeMap] = await Promise.all([
    fetchAllTerms(client, 'product_company'),
    fetchAllTerms(client, 'product_device_type'),
  ]);

  console.log(`  Companies loaded:    ${companyMap.size}`);
  console.log(`  Device types loaded: ${deviceTypeMap.size}`);

  // ── Step 3: Paginate through all Matter products ──────────────────────────
  console.log('\n[3/4] Fetching Matter certified products...');

  // First page to get total count
  const firstPage = await fetchProductPage(client, { categoryId: matterCategoryId, page: 1 });
  if (!firstPage) {
    console.error('  Failed to fetch first page of products.');
    return [];
  }

  const { totalPages, total } = firstPage;
  console.log(`  Total Matter products: ${total}`);
  console.log(`  Total pages (${PER_PAGE}/page): ${totalPages}`);

  const allWpProducts: WpProduct[] = [...firstPage.products];
  await delay();

  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`  Page ${page}/${totalPages} ... `);

    const result = await fetchProductPage(client, { categoryId: matterCategoryId, page });
    if (result) {
      allWpProducts.push(...result.products);
      console.log(`${result.products.length} products (running total: ${allWpProducts.length})`);
    } else {
      console.log('failed — skipping');
    }

    await delay();
  }

  console.log(`\n  Fetched ${allWpProducts.length} raw products`);

  // ── Step 4: Transform to our schema ──────────────────────────────────────
  console.log('\n[4/4] Transforming products...');

  const allProducts: MatterProduct[] = [];
  const seenIds = new Set<string>();

  for (const wp of allWpProducts) {
    const product = transformProduct(wp, companyMap, deviceTypeMap);
    if (!product) continue;
    if (seenIds.has(product.product_id)) continue;
    seenIds.add(product.product_id);
    allProducts.push(product);
  }

  console.log(`  Transformed: ${allProducts.length} unique products`);

  // Category breakdown
  const byCat: Record<string, number> = {};
  for (const p of allProducts) {
    byCat[p.category] = (byCat[p.category] || 0) + 1;
  }
  console.log('\n  By category:');
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(25)} ${count}`);
  }

  // ── Save results ──────────────────────────────────────────────────────────
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`Done. ${allProducts.length} products saved to:`);
  console.log(`  ${outputPath}`);
  console.log('='.repeat(60) + '\n');

  return allProducts;
}
