/**
 * Run the Amazon Bestsellers scraper and save results to data/amazon-bestsellers.json
 *
 * Usage: npx ts-node scripts/run-bestsellers.ts
 *
 * Requires env vars:
 *   AMAZON_PA_ACCESS_KEY
 *   AMAZON_PA_SECRET_KEY
 *   AMAZON_PA_PARTNER_TAG  (or falls back to NEXT_PUBLIC_AMAZON_AFFILIATE_ID)
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeAmazonBestSellers } from '../src/lib/scrapers/amazon-bestsellers';

config({ path: '.env.local' });

async function main() {
  console.log('='.repeat(60));
  console.log('  Amazon Bestsellers Scraper (via PA API)');
  console.log('='.repeat(60));

  const accessKey  = process.env.AMAZON_PA_ACCESS_KEY;
  const secretKey  = process.env.AMAZON_PA_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PA_PARTNER_TAG
    || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_ID;

  if (!accessKey || !secretKey || !partnerTag) {
    console.error('\n❌ Missing required environment variables:');
    if (!accessKey)  console.error('  - AMAZON_PA_ACCESS_KEY');
    if (!secretKey)  console.error('  - AMAZON_PA_SECRET_KEY');
    if (!partnerTag) console.error('  - AMAZON_PA_PARTNER_TAG (or NEXT_PUBLIC_AMAZON_AFFILIATE_ID)');
    console.error('\nGet PA API credentials at: https://affiliate-program.amazon.com/assoc_credentials/home');
    process.exit(1);
  }

  console.log(`\nPartner tag: ${partnerTag}`);
  console.log('Starting scrape...\n');

  let results;
  try {
    results = await scrapeAmazonBestSellers(accessKey, secretKey, partnerTag);
  } catch (err) {
    console.error('\n❌ Scrape failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Save to file
  const outDir  = path.join(process.cwd(), 'data');
  const outFile = path.join(outDir, 'amazon-bestsellers.json');
  fs.mkdirSync(outDir, { recursive: true });

  const output = {
    scraped_at: new Date().toISOString(),
    total: results.length,
    products: results,
  };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`  Done! ${results.length} bestsellers saved`);
  console.log(`  File: ${outFile}`);
  console.log('='.repeat(60));

  // Quick summary
  const byCategory = new Map<string, number>();
  for (const p of results) {
    byCategory.set(p.category, (byCategory.get(p.category) || 0) + 1);
  }
  console.log('\nBy category:');
  for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  const hasImage   = results.filter(p => p.image_url).length;
  const hasPrice   = results.filter(p => p.price).length;
  const hasRating  = results.filter(p => p.rating).length;
  const alexa      = results.filter(p => p.ecosystems.alexa).length;
  const google     = results.filter(p => p.ecosystems.google_home).length;
  const homekit    = results.filter(p => p.ecosystems.apple_homekit).length;

  console.log(`\nData quality:`);
  console.log(`  Has image:   ${hasImage}/${results.length}`);
  console.log(`  Has price:   ${hasPrice}/${results.length}`);
  console.log(`  Has rating:  ${hasRating}/${results.length}`);
  console.log(`  Alexa:       ${alexa}`);
  console.log(`  Google Home: ${google}`);
  console.log(`  HomeKit:     ${homekit}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
