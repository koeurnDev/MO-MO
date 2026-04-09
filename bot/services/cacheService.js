const { redisClient, redisRest } = require('../config/redis');

/**
 * 🚀 Cache Service (Production-Grade)
 * Strategy: Graceful degradation - continue without cache if Redis unavailable
 * Supports both REST (Upstash) and TCP (standard Redis) with fallback
 */

class CacheService {
  constructor() {
    this.fallbackCache = new Map();          // In-memory fallback
    this.maxFallbackSize = 100;              // Limit memory usage
    this.fallbackTTL = new Map();            // Track expiration
    this.initialized = false;
  }

  // Check if Redis is available
  isRedisAvailable() {
    return !!(redisClient?.isOpen || redisRest);
  }

  // SET KEY WITH TTL (in seconds)
  async set(key, value, ttlSeconds = 300) {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis REST first (Upstash)
      if (redisRest) {
        await redisRest.setex(key, ttlSeconds, serialized);
        // console.log(`✅ Cache SET (REST): ${key} (${ttlSeconds}s)`);
        return true;
      }

      // Fallback to TCP Redis
      if (redisClient?.isOpen) {
        await redisClient.setEx(key, ttlSeconds, serialized);
        // console.log(`✅ Cache SET (TCP): ${key} (${ttlSeconds}s)`);
        return true;
      }

      // Last resort: in-memory cache
      this._setFallback(key, serialized, ttlSeconds);
      return true;
    } catch (err) {
      console.error(`⚠️ Cache SET Error (${key}):`, err.message);
      this._setFallback(key, JSON.stringify(value), ttlSeconds);
      return false;
    }
  }

  // GET KEY
  async get(key) {
    try {
      let data;

      // Try Redis REST first (Upstash)
      if (redisRest) {
        data = await redisRest.get(key);
        if (data) {
          // console.log(`✅ Cache HIT (REST): ${key}`);
          return JSON.parse(data);
        }
        // console.log(`⏭️ Cache MISS (REST): ${key}`);
        return null;
      }

      // Fallback to TCP Redis
      if (redisClient?.isOpen) {
        data = await redisClient.get(key);
        if (data) {
          // console.log(`✅ Cache HIT (TCP): ${key}`);
          return JSON.parse(data);
        }
        // console.log(`⏭️ Cache MISS (TCP): ${key}`);
        return null;
      }

      // Last resort: in-memory cache
      return this._getFallback(key);
    } catch (err) {
      console.error(`⚠️ Cache GET Error (${key}):`, err.message);
      return this._getFallback(key);
    }
  }

  // DELETE KEY
  async delete(key) {
    try {
      if (redisRest) {
        await redisRest.del(key);
        return true;
      }

      if (redisClient?.isOpen) {
        await redisClient.del(key);
        return true;
      }

      this.fallbackCache.delete(key);
      this.fallbackTTL.delete(key);
      return true;
    } catch (err) {
      console.error(`⚠️ Cache DELETE Error (${key}):`, err.message);
      return false;
    }
  }

  // CLEAR PATTERN (e.g., "products:*")
  async clearPattern(pattern) {
    try {
      if (redisRest || redisClient?.isOpen) {
        // Pattern matching is limited, so we use del with pattern
        if (redisRest) {
          // Upstash REST doesn't have good pattern support, so best-effort
          console.log(`⚠️ Pattern clear limited for REST cache: ${pattern}`);
          return true;
        }

        if (redisClient?.isOpen) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`🗑️ Cache CLEAR PATTERN (TCP): ${pattern} (${keys.length} keys)`);
          }
          return true;
        }
      }

      // Fallback: clear in-memory
      let cleared = 0;
      const patternRegex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (patternRegex.test(key)) {
          this.fallbackCache.delete(key);
          this.fallbackTTL.delete(key);
          cleared++;
        }
      }
      if (cleared > 0) console.log(`🗑️ Cache CLEAR PATTERN (Memory): ${pattern} (${cleared} keys)`);
      return true;
    } catch (err) {
      console.error(`⚠️ Cache CLEAR PATTERN Error (${pattern}):`, err.message);
      return false;
    }
  }

  // GET-OR-FETCH: If cache hit, return; else fetch & cache
  async getOrFetch(key, fetchFn, ttlSeconds = 300) {
    try {
      // Try cache first
      const cached = await this.get(key);
      if (cached) {
        return cached;
      }

      // Cache miss: fetch fresh data
      const fresh = await fetchFn();
      if (fresh) {
        await this.set(key, fresh, ttlSeconds);
      }
      return fresh;
    } catch (err) {
      console.error(`⚠️ Cache GET-OR-FETCH Error (${key}):`, err.message);
      return await fetchFn();
    }
  }

  // --- IN-MEMORY FALLBACK ---

  _setFallback(key, value, ttlSeconds) {
    if (this.fallbackCache.size >= this.maxFallbackSize) {
      const firstKey = this.fallbackCache.keys().next().value;
      this.fallbackCache.delete(firstKey);
      this.fallbackTTL.delete(firstKey);
    }

    this.fallbackCache.set(key, value);
    this.fallbackTTL.set(key, Date.now() + ttlSeconds * 1000);
  }

  _getFallback(key) {
    const expiry = this.fallbackTTL.get(key);
    if (!expiry || Date.now() > expiry) {
      this.fallbackCache.delete(key);
      this.fallbackTTL.delete(key);
      return null;
    }

    const data = this.fallbackCache.get(key);
    return data ? JSON.parse(data) : null;
  }

  // STATS
  getStats() {
    return {
      redisAvailable: this.isRedisAvailable(),
      fallbackSize: this.fallbackCache.size,
      maxFallbackSize: this.maxFallbackSize
    };
  }
}

module.exports = new CacheService();
