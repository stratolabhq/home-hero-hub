-- Add protocol controller fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_controller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS chipset TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS connection_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_devices INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ha_setup_difficulty TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ha_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS zigbee_version TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS zwave_version TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thread_support BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS recommended_for TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS pros TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS cons TEXT[];

-- Indexes for controller filtering
CREATE INDEX IF NOT EXISTS idx_products_is_controller ON products (is_controller);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products (subcategory);
CREATE INDEX IF NOT EXISTS idx_products_connection_type ON products (connection_type);
