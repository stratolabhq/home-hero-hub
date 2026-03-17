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
  imageUrl?: string;
  detailPageUrl?: string;
  features?: string[];
  categories?: string[];
}

export async function searchItems(
  keywords: string,
  accessKey: string,
  secretKey: string,
  partnerTag: string
): Promise<PAAPISearchResult[]> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payload = JSON.stringify({
    Keywords: keywords,
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.Classifications',
      'Offers.Listings.Price',
    ],
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    SearchIndex: 'Electronics',
    ItemCount: 10,
  });

  const payloadHash = await sha256Hex(payload);

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const canonicalRequest = [
    'POST',
    '/paapi5/searchitems',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(secretKey, dateStamp);
  const signature = bufToHex(await hmacSHA256(signingKey, stringToSign));

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      Host: HOST,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
      Authorization: authorizationHeader,
    },
    body: payload,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PA API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const items: PAAPISearchResult[] = [];

  for (const item of json?.SearchResult?.Items ?? []) {
    const title = item?.ItemInfo?.Title?.DisplayValue ?? '';
    const brand = item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? '';
    const asin = item?.ASIN ?? '';
    const imageUrl = item?.Images?.Primary?.Large?.URL ?? '';
    const detailPageUrl = item?.DetailPageURL ?? '';
    const features: string[] = (item?.ItemInfo?.Features?.DisplayValues ?? []);
    const categories: string[] = (item?.ItemInfo?.Classifications?.ProductGroup?.DisplayValue
      ? [item.ItemInfo.Classifications.ProductGroup.DisplayValue]
      : []);
    const price = item?.Offers?.Listings?.[0]?.Price?.Amount ?? undefined;

    if (asin && title) {
      items.push({ asin, title, brand, price, imageUrl, detailPageUrl, features, categories });
    }
  }

  return items;
}
