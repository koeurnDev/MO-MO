const redis = require('redis');
const { Redis } = require('@upstash/redis');

// 🛡️ Hybrid Redis Configuration:
// 1. REST client (@upstash/redis) for stateless API rate limiting (Render-friendly)
// 2. TCP client (redis) for standard sockets/queues (Bull)

let redisRest = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisRest = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('🔌 Redis (REST): Ready');
}

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;

if (REDIS_URL) {
  redisClient = redis.createClient({ url: REDIS_URL });
  redisClient.on('error', err => console.error('🔴 Redis (TCP) Error:', err));
} else {
  console.warn('⚠️ Redis (TCP): Missing REDIS_URL. Queues will use memory fallback.');
}

const connectRedis = async () => {
  if (redisClient && !redisClient.isOpen) {
    redisClient.connect()
      .then(() => console.log('🔌 Redis (TCP): Connected'))
      .catch(err => console.error('🔴 Redis (TCP) Connection Failed:', err.message));
  }
};

module.exports = { redisClient, redisRest, connectRedis };
