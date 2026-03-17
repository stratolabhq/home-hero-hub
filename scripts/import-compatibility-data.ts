// Import script for Home Hero Hub smart home compatibility database
// Run with: npx ts-node scripts/import-compatibility-data.ts

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local file
config({ path: '.env.local' });

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Debug - URL exists:', !!SUPABASE_URL);
console.log('Debug - Key exists:', !!SUPABASE_SERVICE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('URL:', SUPABASE_URL ? 'Found' : 'Missing');
  console.error('Service Key:', SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Device {
  id: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  protocols: string[];
  ecosystems: {
    alexa?: string;
    google_home?: string;
    apple_homekit?: string;
    smartthings?: string;
    matter?: string;
  };
  requires_hub: string | boolean;
  hub_name?: string;
  features?: string[];
  notes?: string;
}

interface DatabaseData {
  database_info: any;
  ecosystems: any;
  protocols: any;
  devices: Device[];
}

async function importData() {
  console.log('🚀 Starting Home Hero Hub data import...\n');

  const dataPath = path.join(process.cwd(), 'data', 'smart-home-compatibility-database.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: smart-home-compatibility-database.json not found in data/ folder');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data: DatabaseData = JSON.parse(rawData);

  console.log(`📊 Found ${data.devices.length} devices to import\n`);

  // Import Ecosystems
  console.log('1️⃣  Importing ecosystems...');
  
  const ecosystemsToInsert = Object.entries(data.ecosystems).map(([key, value]: [string, any]) => ({
    ecosystem_id: key,
    name: value.name,
    protocols: value.protocols,
    requires_hub: value.requires_hub,
    description: value.description
  }));

  const { error: ecosystemsError } = await supabase
    .from('ecosystems')
    .upsert(ecosystemsToInsert, { onConflict: 'ecosystem_id' });

  if (ecosystemsError) {
    console.error('   ❌ Error importing ecosystems:', ecosystemsError);
  } else {
    console.log(`   ✅ Imported ${ecosystemsToInsert.length} ecosystems\n`);
  }

  // Import Protocols
  console.log('2️⃣  Importing protocols...');
  
  const protocolsToInsert = Object.entries(data.protocols).map(([key, value]: [string, any]) => ({
    protocol_id: key,
    name: value.name,
    type: value.type,
    range: value.range,
    power: value.power,
    requires_hub: value.requires_hub,
    description: value.note || null
  }));

  const { error: protocolsError } = await supabase
    .from('protocols')
    .upsert(protocolsToInsert, { onConflict: 'protocol_id' });

  if (protocolsError) {
    console.error('   ❌ Error importing protocols:', protocolsError);
  } else {
    console.log(`   ✅ Imported ${protocolsToInsert.length} protocols\n`);
  }

  // Import Products
  console.log('3️⃣  Importing products...');
  
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const device of data.devices) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('product_id', device.id)
      .single();

    if (existing) {
      console.log(`   ⏭️  Skipping (already exists): ${device.name}`);
      skippedCount++;
      continue;
    }

    const productData = {
      product_id: device.id,
      name: device.name,
      brand: device.brand,
      category: device.category,
      type: device.type,
      protocols: device.protocols,
      ecosystems: device.ecosystems,
      requires_hub: typeof device.requires_hub === 'boolean' 
        ? device.requires_hub.toString() 
        : device.requires_hub,
      hub_name: device.hub_name || null,
      features: device.features || [],
      notes: device.notes || null
    };

    const { error } = await supabase
      .from('products')
      .insert(productData);

    if (error) {
      console.error(`   ❌ Error importing ${device.name}:`, error.message);
      errorCount++;
    } else {
      console.log(`   ✅ Imported: ${device.name}`);
      importedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${importedCount} products`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount} products`);
  console.log(`❌ Errors: ${errorCount} products`);
  console.log('='.repeat(60));

  // Verify Import
  console.log('\n4️⃣  Verifying import...');
  
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 Total products in database: ${count}\n`);

  // Sample Queries
  console.log('5️⃣  Running sample queries...\n');

  const { data: matterDevices, count: matterCount } = await supabase
    .from('products')
    .select('name, brand', { count: 'exact' })
    .contains('protocols', ['Matter'])
    .limit(5);

  console.log(`   🔍 Matter-compatible devices: ${matterCount} found`);
  matterDevices?.forEach(d => console.log(`      - ${d.brand} ${d.name}`));

  const { count: alexaCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('ecosystems->>alexa', 'full');

  console.log(`\n   🔍 Full Alexa support: ${alexaCount} devices`);

  console.log('\n✅ Import complete! Your database is ready to use.\n');
}

importData().catch((error) => {
  console.error('❌ Fatal error during import:', error);
  process.exit(1);
});
