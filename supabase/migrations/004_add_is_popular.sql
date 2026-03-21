-- Add is_popular flag to products table for curation
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products (is_popular);
