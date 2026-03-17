// Update products with Home Assistant compatibility and images
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Home Assistant compatibility data based on research
const homeAssistantData: Record<string, { ha_support: string; image_url: string }> = {
  // Philips Hue - Full HA support via official integration
  'hue_bulb_a19': {
    ha_support: 'full',
    image_url: 'https://assets.philips.com/is/image/philipsconsumer/046677562823-IMS-en_US'
  },
  
  // TP-Link Kasa - Full support
  'kasa_plug_mini': {
    ha_support: 'full',
    image_url: 'https://www.tp-link.com/us/images/products/kasa-smart-plug-mini.jpg'
  },
  
  // Google Nest - Official integration
  'nest_thermostat': {
    ha_support: 'full',
    image_url: 'https://lh3.googleusercontent.com/OlQad7pnjmXvW4TxLfqNkLx9u5JGVgNWxhcQWW_5ZuA'
  },
  
  // Ring - Limited (no official integration, uses custom components)
  'ring_doorbell_pro': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/51uDKfTzt8L._AC_SL1000_.jpg'
  },
  
  // Aqara - Full support via Zigbee/Matter
  'aqara_hub_m3': {
    ha_support: 'full',
    image_url: 'https://cdn.aqara.com/cdn/website/mainland/static/images/products/hub-m3.png'
  },
  
  // Nanoleaf - Full support
  'nanoleaf_bulb': {
    ha_support: 'full',
    image_url: 'https://nanoleaf.me/en-US/products/essentials/bulb/'
  },
  
  // Ecobee - Official integration
  'ecobee_smart_thermostat': {
    ha_support: 'full',
    image_url: 'https://www.ecobee.com/wp-content/uploads/2021/09/ecobee-smart-thermostat.png'
  },
  
  // August Lock - Community integration
  'august_lock_pro': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/61zqH5oLgdL._AC_SL1500_.jpg'
  },
  
  // Wyze - Community integration (HACS)
  'wyze_cam_v3': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/51N0LQCZVZL._AC_SL1500_.jpg'
  },
  
  // LIFX - Official integration
  'lifx_a19': {
    ha_support: 'full',
    image_url: 'https://cdn.shopify.com/s/files/1/0024/9803/5810/products/LIFX_A19_White.png'
  },
  
  // Eve - Full HomeKit support
  'eve_energy': {
    ha_support: 'full',
    image_url: 'https://www.evehome.com/en-us/eve-energy'
  },
  
  // Schlage - Z-Wave integration
  'schlage_encode': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61DH8qVy8yL._AC_SL1500_.jpg'
  },
  
  // Arlo - Limited support
  'arlo_pro_4': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/61rqz8N8qhL._AC_SL1500_.jpg'
  },
  
  // Sengled - Zigbee support
  'sengled_bulb': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/51xPn5RHJQL._AC_SL1500_.jpg'
  },
  
  // SwitchBot - Official integration
  'switchbot_hub': {
    ha_support: 'full',
    image_url: 'https://us.switch-bot.com/cdn/shop/products/hub-mini-2.png'
  },
  
  // Apple HomePod - Limited (AirPlay only)
  'homepod_mini': {
    ha_support: 'partial',
    image_url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/homepod-mini-blue.png'
  },
  
  // Amazon Echo - Cloud polling only
  'echo_show_15': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/61L0AqNG0fL._AC_SL1500_.jpg'
  },
  
  // Google Nest Hub - Full support
  'nest_hub_max': {
    ha_support: 'full',
    image_url: 'https://lh3.googleusercontent.com/XeLIdTJP8N_T7iZ_x0qV9nqRTzqnhLhPHw'
  },
  
  // TP-Link Tapo - Full support
  'tp_link_tapo_bulb': {
    ha_support: 'full',
    image_url: 'https://static.tp-link.com/L530E_Normal_1654652647829j.png'
  },
  
  // Aqara sensors - Full Zigbee support
  'aqara_door_sensor': {
    ha_support: 'full',
    image_url: 'https://cdn.aqara.com/cdn/website/mainland/static/images/door-sensor-p2.png'
  },
  
  // Yale Lock - Z-Wave/Zigbee support
  'yale_assure_lock': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/51cIFW7HQZL._AC_SL1500_.jpg'
  },
  
  // Meross - Full support
  'meross_outdoor_plug': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61pv8yP9qzL._AC_SL1500_.jpg'
  },
  
  // Lutron Caseta - Official integration
  'lutron_caseta_dimmer': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61jxGzKPQTL._AC_SL1500_.jpg'
  },
  
  // Govee - Community integration
  'govee_light_strip': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/71GnTQqM+hL._AC_SL1500_.jpg'
  },
  
  // Honeywell - Official integration
  'honeywell_t9': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61UoQ8uKVxL._AC_SL1500_.jpg'
  },
  
  // Eufy - Limited support
  'eufy_doorbell': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/61BUJl6QEYL._AC_SL1500_.jpg'
  },
  
  // Leviton - Z-Wave support
  'leviton_switch': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/51d1gNYx3nL._AC_SL1500_.jpg'
  },
  
  // Ring Alarm - Limited
  'ring_alarm_pro': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/51S1xRXqQdL._AC_SL1000_.jpg'
  },
  
  // Aqara Motion - Full Zigbee
  'aqara_motion_sensor': {
    ha_support: 'full',
    image_url: 'https://cdn.aqara.com/cdn/website/mainland/static/images/motion-sensor-p2.png'
  },
  
  // Wemo - Official integration
  'wemo_smart_plug': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61Jm3RqztML._AC_SL1500_.jpg'
  },
  
  // IKEA Tradfri - Official integration
  'ikea_tradfri_bulb': {
    ha_support: 'full',
    image_url: 'https://www.ikea.com/us/en/images/products/tradfri-led-bulb-e26.jpg'
  },
  
  // Shelly - Excellent local support
  'shelly_plug': {
    ha_support: 'full',
    image_url: 'https://shelly.cloud/wp-content/uploads/2021/07/shelly_plug_s.png'
  },
  
  // Aqara Switch - Full support
  'aqara_light_switch': {
    ha_support: 'full',
    image_url: 'https://cdn.aqara.com/cdn/website/mainland/static/images/switch-h2.png'
  },
  
  // TP-Link Kasa Cam - Full support
  'tplink_kasa_cam': {
    ha_support: 'full',
    image_url: 'https://static.tp-link.com/2021/KC115_01_1920.png'
  },
  
  // GE Cync - Cloud integration
  'ge_cync_bulb': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/51sPQs6hUgL._AC_SL1500_.jpg'
  },
  
  // Sonos - Official integration
  'sonos_one': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/51N2dqo-MfL._AC_SL1500_.jpg'
  },
  
  // Chamberlain myQ - Community
  'chamberlain_myq': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/61l9vYCaQYL._AC_SL1500_.jpg'
  },
  
  // Amazon Thermostat - Cloud only
  'amazon_smart_thermostat': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/51aqAu8CjjL._AC_SL1500_.jpg'
  },
  
  // WiZ - Local API support
  'wiz_bulb': {
    ha_support: 'full',
    image_url: 'https://m.media-amazon.com/images/I/61AqpKh7fSL._AC_SL1500_.jpg'
  },
  
  // SwitchBot Curtain - Official
  'switchbot_curtain': {
    ha_support: 'full',
    image_url: 'https://us.switch-bot.com/cdn/shop/products/curtain-3.png'
  },
  
  // Flic Twist - Matter support
  'flic_twist': {
    ha_support: 'full',
    image_url: 'https://flic.io/wp-content/uploads/flic-twist.png'
  },
  
  // Level Lock - Matter support
  'level_lock': {
    ha_support: 'full',
    image_url: 'https://level.co/wp-content/uploads/level-lock-plus.png'
  },
  
  // Govee Outdoor - Community
  'govee_outdoor_lights': {
    ha_support: 'partial',
    image_url: 'https://m.media-amazon.com/images/I/71HhYK7xwpL._AC_SL1500_.jpg'
  },
  
  // Aqara Smart Lock - Full Zigbee
  'aqara_smart_lock': {
    ha_support: 'full',
    image_url: 'https://cdn.aqara.com/cdn/website/mainland/static/images/lock-u50.png'
  }
};

async function updateProducts() {
  console.log('🔄 Updating products with Home Assistant compatibility and images...\n');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [productId, data] of Object.entries(homeAssistantData)) {
    const { error } = await supabase
      .from('products')
      .update({
        home_assistant: data.ha_support,
        image_url: data.image_url
      })
      .eq('product_id', productId);

    if (error) {
      console.error(`❌ Error updating ${productId}:`, error.message);
      errors++;
    } else {
      console.log(`✅ Updated ${productId}`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Update Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} products`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(60));
  console.log('\n✨ Home Assistant compatibility and images added!\n');
}

updateProducts().catch(console.error);
