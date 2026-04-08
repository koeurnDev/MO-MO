-- 🛡️ Senior Performance Engineering: Critical Production Indexes
-- Analysis of p99 query patterns reveals missing cover indexes for orders and products.

-- 1. Index for User Order History (Orders Page)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created 
ON orders(user_id, created_at DESC);

-- 2. Index for Order Status Filtering (Admin Dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders(status, created_at DESC);

-- 3. Index for Stock Filtering (Search/Browse)
CREATE INDEX IF NOT EXISTS idx_products_stock_category 
ON products(stock DESC, category);

-- 4. Index for Active Coupon Lookup
CREATE INDEX IF NOT EXISTS idx_coupons_active_auto 
ON coupons(active, is_auto) WHERE active = true;

-- 5. Index for User Profile Lookups
CREATE INDEX IF NOT EXISTS idx_users_id_phone 
ON users(id, phone);

-- 6. Index for Wishlist Lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id 
ON wishlist(user_id);

-- Run VACUUM & ANALYZE to update statistics for the Query Planner
-- (In some environments this might be restricted, but helpful if allowed)
-- ANALYZE products;
-- ANALYZE orders;
-- ANALYZE users;
