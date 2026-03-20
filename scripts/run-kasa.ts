import { scrapeKasa } from '../src/lib/scrapers/kasa-scraper';
import { importKasa } from './import-kasa';

async function main(): Promise<void> {
  const start = Date.now();

  // ── Step 1: Scrape ───────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          STEP 1 — Scrape TP-Link Kasa Website           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const products = await scrapeKasa();

  if (products.length === 0) {
    console.error('No products scraped. Check the scraper output above for errors.');
    process.exit(1);
  }

  // ── Step 2: Import ───────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║             STEP 2 — Import to Supabase                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const importResult = await importKasa();

  // ── Final stats ──────────────────────────────────────────────────────────
  const durationSec = ((Date.now() - start) / 1000).toFixed(1);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL STATS                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Scraped:   ${String(products.length).padEnd(45)}║`);
  console.log(`║  Added:     ${String(importResult.added).padEnd(45)}║`);
  console.log(`║  Skipped:   ${String(importResult.skipped).padEnd(45)}║`);
  console.log(`║  Errors:    ${String(importResult.errors).padEnd(45)}║`);
  console.log(`║  Duration:  ${String(durationSec + 's').padEnd(45)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
