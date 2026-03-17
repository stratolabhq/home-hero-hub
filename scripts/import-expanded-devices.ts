import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function importExpandedDevices() {
  console.log('🚀 Starting import of expanded device database...\n');

  // Read the expanded devices JSON
  const dataPath = path.join(__dirname, '..', 'data', 'expanded-devices.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: expanded-devices.json not found in data/ folder');
    console.log('📁 Expected location:', dataPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const devices = JSON.parse(rawData);

  console.log(`📦 Found ${devices.length} devices to import\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const device of devices) {
    try {
      // Check if device already exists
      const { data: existing, error: checkError } = await supabase
        .from('products')
        .select('id, product_id')
        .eq('product_id', device.product_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log(`⏭️  Skipped: ${device.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Insert the device
      const { error: insertError } = await supabase
        .from('products')
        .insert([device]);

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Added: ${device.name} by ${device.brand}`);
      successCount++;

    } catch (error) {
      console.error(`❌ Error importing ${device.product_id}:`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${successCount} devices`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount} devices`);
  console.log(`❌ Failed: ${errorCount} devices`);
  console.log(`📦 Total processed: ${devices.length} devices`);
  console.log('='.repeat(60) + '\n');
}

importExpandedDevices()
  .then(() => {
    console.log('✨ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
