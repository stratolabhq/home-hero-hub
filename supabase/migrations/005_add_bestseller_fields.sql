-- Add Amazon bestseller tracking fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS asin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bestseller_rank INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- Indexes for fast bestseller queries
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON products (is_bestseller);
CREATE INDEX IF NOT EXISTS idx_products_asin ON products (asin);
CREATE INDEX IF NOT EXISTS idx_products_bestseller_rank ON products (bestseller_rank) WHERE is_bestseller = true;
