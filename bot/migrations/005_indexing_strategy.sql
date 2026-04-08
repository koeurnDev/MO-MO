-- MO-MO Elite Database Indexing Strategy (v5)
-- Goal: Sub-millisecond lookups for global scale Telegram traffic.

-- 1. UUID/Order Code Lookups (Exact Match)
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_idemp_key ON orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. User Relationship Mapping (Foreign Key Optimization)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist (user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (active) WHERE active = true;

-- 3. Product Discovery (Full-Text Search & Category Filtering)
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_fTS ON products USING GIN (to_tsvector('english', name || ' ' || description));

-- 4. Dynamic Sorting (Price Range Coverage)
CREATE INDEX IF NOT EXISTS idx_products_price_asc ON products (price ASC);
