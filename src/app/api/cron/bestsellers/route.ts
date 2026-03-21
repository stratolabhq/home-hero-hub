import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeAmazonBestSellers } from '@/lib/scrapers/amazon-bestsellers';

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessKey  = process.env.AMAZON_PA_ACCESS_KEY;
  const secretKey  = process.env.AMAZON_PA_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PA_PARTNER_TAG
    || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_ID;

  if (!accessKey || !secretKey || !partnerTag) {
    return NextResponse.json({ error: 'Missing Amazon PA API credentials' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const products = await scrapeAmazonBestSellers(accessKey, secretKey, partnerTag);

    let updated  = 0;
    let inserted = 0;

    for (const bs of products) {
      // Try update by ASIN first
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('asin', bs.asin)
        .maybeSingle();

      if (existing) {
        await supabase.from('products').update({
          is_bestseller:   true,
          is_popular:      true,
          bestseller_rank: bs.bestseller_rank,
          last_updated:    bs.last_updated,
          ...(bs.rating       !== undefined && { rating:       bs.rating }),
          ...(bs.review_count !== undefined && { review_count: bs.review_count }),
          ...(bs.image_url                  && { image_url:    bs.image_url }),
        }).eq('id', existing.id);
        updated++;
      } else {
        const slug = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        await supabase.from('products').insert({
          product_id:      `${slug(bs.brand).slice(0, 20)}-${slug(bs.name).slice(0, 40)}-${bs.asin}`,
          name:            bs.name,
          brand:           bs.brand,
          category:        bs.category,
          type:            bs.category,
          asin:            bs.asin,
          protocols:       bs.protocols,
          ecosystems:      bs.ecosystems,
          requires_hub:    'false',
          features:        [],
          notes:           `ASIN: ${bs.asin}`,
          home_assistant:  false,
          price_range:     bs.price_range,
          image_url:       bs.image_url || null,
          is_bestseller:   true,
          is_popular:      true,
          bestseller_rank: bs.bestseller_rank,
          last_updated:    bs.last_updated,
          ...(bs.rating       !== undefined && { rating:       bs.rating }),
          ...(bs.review_count !== undefined && { review_count: bs.review_count }),
        });
        inserted++;
      }
    }

    return NextResponse.json({
      ok:       true,
      total:    products.length,
      updated,
      inserted,
      at:       new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
