const AFFILIATE_ID = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_ID || '';

export function generateAmazonLink(productName: string, brand: string): string {
  const query = encodeURIComponent(`${brand} ${productName}`.trim());
  const tag = AFFILIATE_ID ? `&tag=${AFFILIATE_ID}` : '';
  return `https://www.amazon.com/s?k=${query}${tag}`;
}
