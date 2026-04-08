-- 🚀 Phase 2 Performance: Materialized Views
-- This view pre-calculates expensive aggregations for products to ensure sub-100ms dashboard loads.

CREATE MATERIALIZED VIEW IF NOT EXISTS product_stats AS
SELECT 
    p.id as product_id,
    p.name,
    p.category,
    p.price,
    p.stock,
    COALESCE(SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END), 0) as units_sold,
    COALESCE(COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'paid'), 0) as successful_orders
FROM products p
LEFT JOIN orders o ON o.items::jsonb @> jsonb_build_array(jsonb_build_object('id', p.id))
GROUP BY p.id;

-- Create index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_stats_id ON product_stats(product_id);

-- Refresh logic (Manual/Trigger/CRON)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY product_stats;
