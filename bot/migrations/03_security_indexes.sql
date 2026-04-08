-- MO-MO Boutique Security & Performance Indexes
-- Purpose: Accelerate common lookups and ensure cross-column uniqueness.

-- 1. Order Lookups (User context + Recent first)
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- 2. Product Search & Categorization
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 3. User Activity Tracking
CREATE INDEX IF NOT EXISTS idx_users_last_updated ON users(last_updated DESC);

-- 4. Re-verify Unique Constraints (Idempotency)
-- This ensures financial safety for order creation.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_orders_idempotency_unique') THEN
        ALTER TABLE orders ADD CONSTRAINT idx_orders_idempotency_unique UNIQUE (user_id, idempotency_key);
    END IF;
END $$;
