import { SupabaseClient } from '@supabase/supabase-js';

const AFFILIATE_ID = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_ID || '';

export function generateAmazonLink(productName: string, brand: string): string {
  const query = encodeURIComponent(`${brand} ${productName}`.trim());
  const tag = AFFILIATE_ID ? `&tag=${AFFILIATE_ID}` : '';
  return `https://www.amazon.com/s?k=${query}${tag}`;
}

export async function trackAmazonClick(
  supabase: SupabaseClient,
  productId: string,
  productName: string,
  brand: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('amazon_clicks').insert({
    product_id: productId,
    user_id: user?.id ?? null,
    product_name: productName,
    brand,
  });
}
