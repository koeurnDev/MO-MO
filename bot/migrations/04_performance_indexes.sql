-- MO-MO Performance Indexing Migration (v1)
-- Added to resolve app slowness identified during audit

-- 1. Fast User Order History (P0)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id, created_at DESC);

-- 2. Fast Status-based Lookups (Admin & Sync)
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status, created_at DESC);

-- 3. Optimized Product Stock Filtering (Storefront) 
CREATE INDEX IF NOT EXISTS idx_products_stock_category
ON products(stock DESC, category);

-- 4. Active Coupon Lookups (Checkout Performance)
CREATE INDEX IF NOT EXISTS idx_coupons_active 
ON coupons(active) WHERE active = true;

-- 5. Idempotency Key Speed (Security & Correctness)
CREATE INDEX IF NOT EXISTS idx_orders_idempotency 
ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Analyze tables to update statistics for the query planner
ANALYZE orders;
ANALYZE products;
ANALYZE coupons;
