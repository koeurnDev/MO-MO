-- MO-MO Advanced Performance Indexing (v2)
-- Based on Senior Engineer Audit findings

-- 1. Optimized Product Browsing by Category (Storefront P0)
CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON products(category, id DESC);

-- 2. Fast Customer Search (Admin Search & Filtering)
CREATE INDEX IF NOT EXISTS idx_orders_user_phone 
ON orders(user_id, phone) WHERE phone IS NOT NULL;

-- 3. Wishlist Performance (Profile Page Speed)
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id 
ON wishlist(user_id, created_at DESC);

-- 4. Coupon Expiry Logic (Checkout Speed)
CREATE INDEX IF NOT EXISTS idx_coupons_active_date 
ON coupons(is_auto, end_date) WHERE is_auto = true;

-- Update statistics for the query planner
ANALYZE products;
ANALYZE orders;
ANALYZE wishlist;
ANALYZE coupons;
