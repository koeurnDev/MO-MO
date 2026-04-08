# 🎯 PERFORMANCE OPTIMIZATION ROADMAP
## Telegram Mini App - Week-by-Week Execution Plan

---

## WEEK 1: Critical Fixes (Stop the Bleeding)

### Monday (Day 1-2): Quick Wins (1-2 hours)
- [ ] **Remove React.StrictMode** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-1-remove-reactstrictmode-5-minutes)
  - **Impact:** -30% render time
  - **Effort:** 5 minutes
  - **Files:** webapp/src/main.jsx
  - **Deploy:** Immediately to production

- [ ] **Increase DB Connection Pool** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-3-increase-database-connection-pool-15-minutes)
  - **Impact:** -90% connection timeouts
  - **Effort:** 15 minutes
  - **Files:** bot/db.js, render.yaml
  - **Deploy:** After internal testing (1 hour)

- [ ] **Memoize Cart Discounts** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-2-memoize-cart-discount-calculation-30-minutes)
  - **Impact:** -60% cart latency
  - **Effort:** 30 minutes
  - **Files:** webapp/src/components/CartPage.jsx
  - **Deploy:** After testing checkout flow (30 min)

**Status after Monday:** 3 critical improvements deployed  
**Expected improvement:** 40-50% faster user experience

---

### Tuesday (Day 3): Endpoint Consolidation (2 hours)
- [ ] **Consolidate Settings Endpoints** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-4-consolidate-settings-endpoints-1-hour)
  - **Impact:** -80% settings API calls, -60% DB queries
  - **Effort:** 1-2 hours (60 min backend + 60 min frontend)
  - **Files:** 
    - bot/routes/public.js (backend)
    - webapp/src/App.jsx (frontend)
  - **Testing:** 
    1. Test new /api/settings endpoint with Postman
    2. Verify frontend loads all required settings
    3. Check localStorage caching still works
  - **Rollback:** Keep old endpoints for 48hrs as fallback

**Status after Tuesday:** API layer optimized  
**Database load reduced by 60%**

---

### Wednesday (Day 4): Async Background Jobs (1.5 hours)
- [ ] **Setup Redis** (if not already set up)
  ```bash
  npm install bull redis
  ```
  Update render.yaml or .env with Redis connection

- [ ] **Move Telegram Notifications to Background** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-5-async-telegram-notifications-1-hour)
  - **Impact:** -300-500ms from order response
  - **Effort:** 1-1.5 hours
  - **Files:** bot/routes/orders.js
  - **Testing:**
    1. Create test order and verify notification sent (check admin receives message)
    2. Verify order response < 300ms
    3. Test retry logic if Telegram is down
  - **Monitoring:** Add queue size monitoring

**Status after Wednesday:** Order response time improved 50%  
**Real-time feedback improved**

---

### Thursday (Day 5): Query Optimization (2.5 hours)
- [ ] **Parallelize Order Creation Queries** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-6-parallelize-order-creation-queries-2-hours)
  - **Impact:** Query time from 400-500ms → 80-120ms
  - **Effort:** 2 hours
  - **Files:** bot/routes/orders.js
  - **Testing:**
    1. Run 10 concurrent order creations
    2. Measure p99 latency (target: <200ms)
    3. Verify price calculations still correct
  - **Database:** Add indexes if needed

- [ ] **Add ProductCard Memoization** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-7-add-productcard-memoization-with-discount-map-1-hour)
  - **Impact:** -50-70% re-renders
  - **Effort:** 1-1.5 hours
  - **Files:** 
    - webapp/src/components/ProductCard.jsx
    - webapp/src/components/ProductGrid.jsx
  - **Testing:** 
    1. Add 5 items to cart, measure frame time
    2. No visual glitches or missing discounts

**Status after Thursday:** Rendering performance optimized  
**UI feels significantly faster**

---

## WEEK 2: Infrastructure & Caching

### Monday (Day 8): Rate Limiting Upgrade (1.5 hours)
- [ ] **Implement Redis Rate Limiting** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-8-rate-limiter-with-redis-2-hours)
  - **Impact:** -80% memory growth, unlimited scalability
  - **Effort:** 2 hours
  - **Files:** bot/index.js
  - **Testing:**
    1. Simulate 1000 concurrent requests with ab/wrk
    2. Memory should not grow (stay at 200-300MB)
    3. Rate limits enforced correctly
  - **Monitoring:** Track Redis memory usage

- [ ] **Image Optimization** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-10-image-optimization-1-hour)
  - **Impact:** -40-60% image bandwidth
  - **Effort:** 1 hour
  - **Files:** webapp/src/components/ProductCard.jsx
  - **Testing:** Check DevTools Network tab for smaller images

**Status after Monday:** Infrastructure ready for scaling  
**Memory usage becomes predictable**

---

### Tuesday (Day 9): Pagination (1.5 hours)
- [ ] **Add Order Pagination** → [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md#fix-9-add-pagination-to-orders-15-hours)
  - **Impact:** -70% response size
  - **Effort:** 1.5 hours
  - **Files:**
    - bot/db.js
    - bot/routes/public.js
    - webapp (order history component)
  - **Testing:**
    1. User with 500 orders → first page loads <200ms
    2. "Load more" button works
    3. No duplicate orders on pagination

**Status after Tuesday:** Response sizes optimized  
**Ready for users with large order histories**

---

### Wednesday-Thursday (Day 10-11): Database Optimization (4 hours)
- [ ] **Create Materialized Views for Product Stats**
  ```sql
  -- In PostgreSQL:
  CREATE MATERIALIZED VIEW product_stats AS
  SELECT 
    p.id,
    p.name,
    p.price,
    COALESCE(SUM(oi.quantity), 0) as units_sold,
    COALESCE(AVG(r.rating), NULL) as avg_rating,
    COALESCE(COUNT(r.id), 0) as review_count
  FROM products p
  LEFT JOIN (
    SELECT (json_array_elements(items)->>'id')::int as product_id, 
            (json_array_elements(items)->>'quantity')::int as quantity
    FROM orders WHERE status != 'cancelled'
  ) oi ON p.id = oi.product_id
  LEFT JOIN reviews r ON p.id = r.product_id
  GROUP BY p.id;
  
  CREATE INDEX idx_product_stats_id ON product_stats(id);
  REFRESH MATERIALIZED VIEW product_stats;
  ```
  
  - **Effort:** 1 hour setup
  - **Maintenance:** Refresh hourly via cron job or manual

- [ ] **Optimize getInitialData() to use materialized view**
  - **Impact:** -60% latency, -50% CPU
  - **Effort:** 1-2 hours
  - **Files:** bot/db.js
  - **Testing:** `/api/init` should respond in <150ms

**Status after Thursday:** Database queries optimized  
**/api/init latency expected: 150-200ms (from 1000ms)**

---

## WEEK 3: Monitoring & Load Testing

### Monday (Day 15): Setup Monitoring
- [ ] **Install Prometheus metrics** (optional but recommended)
  ```bash
  npm install prom-client
  ```
  
- [ ] **Key metrics to track:**
  - HTTP request latency (p50, p95, p99)
  - Database query latency
  - Rate limiter hits
  - Redis memory usage
  - Node.js event loop latency
  
- [ ] **Set up alerting:**
  - Alert if API latency p99 > 500ms
  - Alert if error rate > 1%
  - Alert if memory > 1GB

---

### Tuesday-Wednesday (Day 16-17): Load Testing
- [ ] **Install load testing tool:**
  ```bash
  # Option 1: Apache Bench
  ab -n 10000 -c 100 http://localhost:3000/api/init
  
  # Option 2: wrk (recommended)
  wrk -t4 -c100 -d30s http://localhost:3000/api/init
  
  # Option 3: k6 (best)
  npm install -D k6
  ```

- [ ] **Test scenarios:**
  1. **Baseline (10 concurrent):** Measure baseline latency
  2. **Light load (100 concurrent):** 5 minute sustained
  3. **Medium load (500 concurrent):** 10 minute sustained
  4. **Heavy load (1000 concurrent):** 15 minute burst
  5. **Spikey load:** 500 → 2000 → 500 over 5 minutes

- [ ] **Acceptance criteria:**
  | Metric | Target | Current? |
  |--------|--------|----------|
  | /api/init @ 100 users | <200ms | TBD |
  | Order creation @ 100 users | <300ms | TBD |
  | Error rate @ 1000 users | <0.1% | TBD |
  | Memory @ 1000 concurrent | <1GB | TBD |
  | Telegram notif deliver time | <5s | TBD |

---

### Thursday (Day 18): Regression Testing
- [ ] **Functional tests:**
  - [ ] Product browse & filter works
  - [ ] Add to cart calculations correct
  - [ ] Discount application accurate
  - [ ] Order creation succeeds
  - [ ] Order tracking shows correct status
  - [ ] Admin dashboard loads
  - [ ] Wishlist functionality works
  - [ ] Lazy loading of components works

- [ ] **Performance regression tests:**
  - [ ] Initial load < 2 seconds (LCP)
  - [ ] Cart update < 100ms
  - [ ] Discount calculation visible immediately
  - [ ] Admin pagination works smoothly

---

### Friday (Day 19): Staging Deploy & Validation
- [ ] **Deploy to staging environment**
  ```bash
  git push origin optimizations
  # On render.yaml environment
  ```

- [ ] **Validate in staging:**
  1. All endpoints responding
  2. Database queries performing
  3. Redis connected and working
  4. Notifications being sent
  5. No error logs

- [ ] **Get stakeholder sign-off**

---

## WEEK 4: Production & Post-Launch

### Monday (Day 22): Production Deploy
- [ ] **Pre-flight checklist:**
  - [ ] Database backups current
  - [ ] Monitoring configured
  - [ ] Alerting active
  - [ ] Rollback plan documented
  - [ ] Team notified
  - [ ] On-call engineer assigned

- [ ] **Deployment:**
  ```bash
  # Gradual rollout (if possible)
  # 10% traffic → monitor 30 min
  # 50% traffic → monitor 30 min
  # 100% traffic
  ```

- [ ] **Post-deploy validation:**
  1. Check error rates (should be near-zero)
  2. Verify latency improvements
  3. Confirm notifications working
  4. Monitor memory usage
  5. Check for new issues in logs

---

### Tuesday-Friday (Day 23-26): Monitoring & Tuning
- [ ] **Daily monitoring:**
  - Review logs for errors
  - Check performance metrics
  - Verify rate limits working
  - Monitor database performance
  - Check Redis health

- [ ] **Fine-tuning:**
  - Adjust connection pool if needed (based on load)
  - Adjust cache TTLs based on traffic patterns
  - Optimize slow queries if found
  - Scale Redis if needed

---

## Success Metrics (Week 4+)

### Before:
```
Initial load: 3-4 seconds
API latency p99: 800-1000ms
Order creation: 600-800ms
Memory @ 100 users: 500MB
Memory @ 1000 users: Crashes (OOM)
```

### After (Target):
```
Initial load: 800-1200ms (60% improvement)
API latency p99: 200-300ms (75% improvement)
Order creation: 100-150ms (85% improvement)
Memory @ 100 users: 300MB (40% reduction)
Memory @ 1000 users: Stable at 600-800MB (SCALABLE)
Error rate: <0.1% (high availability)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Query optimization breaks pricing** | Run full regression test suite, compare old vs new calculations on 100 random orders |
| **Redis becomes single point of failure** | Configure Redis with Sentinel, have fallback to memory cache |
| **Database materialized view becomes stale** | Refresh hourly, monitor freshness metrics |
| **Load test shows issues** | Scale back features if needed, don't launch to 1000 users immediately |
| **Notification queue backs up** | Add Dead Letter Queue (DLQ), monitor queue depth |

---

## Resource Requirements

- **Time:** 40-50 engineer hours total
- **Infrastructure:** 
  - Redis instance (~$30-50/month)
  - PostgreSQL larger instance if needed
  - Monitoring (DataDog/New Relic if using managed)
- **Team:** 1-2 engineers to execute

---

## Communication Plan

- **Week 1:** Internal testing only, don't announce
- **Week 2:** Prepare changelog/blog post
- **Week 3:** Brief stakeholders on findings
- **Day 22:** Deploy to production
- **Day 23:** Send announcement to users: "We've made the app 70% faster! 🚀"

---

## Document References

- Full analysis: [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md)
- Code fixes: [IMMEDIATE_FIXES.md](IMMEDIATE_FIXES.md)
- This roadmap: [OPTIMIZATION_ROADMAP.md](OPTIMIZATION_ROADMAP.md)

---

**Good luck! Your app is about to become lightning fast. ⚡**

*Questions? Review the PERFORMANCE_ANALYSIS.md for detailed explanations of each bottleneck.*
