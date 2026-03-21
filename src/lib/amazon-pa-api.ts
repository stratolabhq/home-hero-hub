// Amazon Product Advertising API v5 with AWS Signature Version 4

const SERVICE = 'ProductAdvertisingAPI';
const REGION = 'us-east-1';
const HOST = 'webservices.amazon.com';
const ENDPOINT = `https://${HOST}/paapi5/searchitems`;

async function hmacSHA256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretKey: string, dateStamp: string): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSHA256(kDate, REGION);
  const kService = await hmacSHA256(kRegion, SERVICE);
  return hmacSHA256(kService, 'aws4_request');
}

export interface PAAPISearchResult {
  asin: string;
  title: string;
  brand: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  detailPageUrl?: string;
  features?: string[];
  categories?: string[];
}

// ─── Generic signed request helper ───────────────────────────────────────────

async function makeSignedRequest(
  path: string,
  target: string,
  payload: object,
  accessKey: string,
  secretKey: string,
): Promise<unknown> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const body = JSON.stringify(payload);
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST', path, '', canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(secretKey, dateStamp);
  const signature = bufToHex(await hmacSHA256(signingKey, stringToSign));
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${HOST}${path}`, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      Host: HOST,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': target,
      Authorization: authorization,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PA API ${path} error ${response.status}: ${errText}`);
  }
  return response.json();
}

// ─── GetItems ────────────────────────────────────────────────────────────────

export async function getItems(
  asins: string[],
  accessKey: string,
  secretKey: string,
  partnerTag: string,
): Promise<PAAPISearchResult[]> {
  if (asins.length === 0) return [];
  // API max is 10 items per request
  const batch = asins.slice(0, 10);

  const json = await makeSignedRequest(
    '/paapi5/getitems',
    'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
    {
      ItemIds: batch,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.Features',
        'ItemInfo.Classifications',
        'Offers.Listings.Price',
        'CustomerReviews.Count',
        'CustomerReviews.StarRating',
      ],
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
    },
    accessKey,
    secretKey,
  ) as Record<string, unknown>;

  const results: PAAPISearchResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (json?.ItemsResult as any)?.Items ?? []) {
    const asin = item?.ASIN ?? '';
    const title = item?.ItemInfo?.Title?.DisplayValue ?? '';
    if (!asin || !title) continue;
    results.push({
      asin,
      title,
      brand: item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? '',
      price: item?.Offers?.Listings?.[0]?.Price?.Amount,
      rating: item?.CustomerReviews?.StarRating?.DisplayValue
        ? parseFloat(item.CustomerReviews.StarRating.DisplayValue)
        : undefined,
      reviewCount: item?.CustomerReviews?.Count?.DisplayValue
        ? parseInt(item.CustomerReviews.Count.DisplayValue, 10)
        : undefined,
      imageUrl: item?.Images?.Primary?.Large?.URL ?? '',
      detailPageUrl: item?.DetailPageURL ?? '',
      features: item?.ItemInfo?.Features?.DisplayValues ?? [],
      categories: item?.ItemInfo?.Classifications?.ProductGroup?.DisplayValue
        ? [item.ItemInfo.Classifications.ProductGroup.DisplayValue]
        : [],
    });
  }
  return results;
}

// ─── GetBrowseNodes (TopSellers) ─────────────────────────────────────────────

export async function getBrowseNodeTopSellers(
  browseNodeIds: string[],
  accessKey: string,
  secretKey: string,
  partnerTag: string,
): Promise<string[]> {
  const json = await makeSignedRequest(
    '/paapi5/getbrowsenodes',
    'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetBrowseNodes',
    {
      BrowseNodeIds: browseNodeIds,
      Resources: ['BrowseNodeInfo.BrowseNodes.TopSellers'],
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      LanguagesOfPreference: ['en_US'],
    },
    accessKey,
    secretKey,
  ) as Record<string, unknown>;

  const asins: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = (json?.BrowseNodesResult as any)?.BrowseNodes ?? [];
  for (const node of nodes) {
    for (const seller of node?.TopSellers?.TopSellers ?? []) {
      if (seller?.ASIN) asins.push(seller.ASIN);
    }
  }
  return [...new Set(asins)];
}

export async function searchItems(
  keywords: string,
  accessKey: string,
  secretKey: string,
  partnerTag: string,
  browseNodeId?: string,
): Promise<PAAPISearchResult[]> {
  const payload: Record<string, unknown> = {
    Keywords: keywords,
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.Classifications',
      'Offers.Listings.Price',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
    ],
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    SearchIndex: 'All',
    ItemCount: 10,
  };
  if (browseNodeId) payload.BrowseNodeId = browseNodeId;

  const json = await makeSignedRequest(
    '/paapi5/searchitems',
    'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
    payload,
    accessKey,
    secretKey,
  ) as Record<string, unknown>;

  const items: PAAPISearchResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (json?.SearchResult as any)?.Items ?? []) {
    const asin = item?.ASIN ?? '';
    const title = item?.ItemInfo?.Title?.DisplayValue ?? '';
    if (!asin || !title) continue;
    items.push({
      asin,
      title,
      brand: item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? '',
      price: item?.Offers?.Listings?.[0]?.Price?.Amount,
      rating: item?.CustomerReviews?.StarRating?.DisplayValue
        ? parseFloat(item.CustomerReviews.StarRating.DisplayValue)
        : undefined,
      reviewCount: item?.CustomerReviews?.Count?.DisplayValue
        ? parseInt(item.CustomerReviews.Count.DisplayValue, 10)
        : undefined,
      imageUrl: item?.Images?.Primary?.Large?.URL ?? '',
      detailPageUrl: item?.DetailPageURL ?? '',
      features: item?.ItemInfo?.Features?.DisplayValues ?? [],
      categories: item?.ItemInfo?.Classifications?.ProductGroup?.DisplayValue
        ? [item.ItemInfo.Classifications.ProductGroup.DisplayValue]
        : [],
    });
  }
  return items;
}
