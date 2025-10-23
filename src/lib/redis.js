const { createClient } = require('redis');

// Create Redis client with error handling
let redisClient;

try {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Redis max retries reached');
        }
        return retries * 100;
      }
    }
  });

  redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis Client Ready');
  });

} catch (error) {
  console.error('Redis initialization error:', error);
}

// Cache helper functions
const cacheHelper = {
  async get(key, tenantId = null) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not connected, skipping cache get');
        return null;
      }
      
      const fullKey = tenantId ? `tenant:${tenantId}:${key}` : key;
      const data = await redisClient.get(fullKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, tenantId = null, ttl = 3600) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not connected, skipping cache set');
        return;
      }
      
      const fullKey = tenantId ? `tenant:${tenantId}:${key}` : key;
      await redisClient.setEx(fullKey, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async del(key, tenantId = null) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not connected, skipping cache delete');
        return;
      }
      
      const fullKey = tenantId ? `tenant:${tenantId}:${key}` : key;
      await redisClient.del(fullKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  async invalidatePattern(pattern, tenantId = null) {
    try {
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not connected, skipping pattern invalidation');
        return;
      }
      
      const fullPattern = tenantId ? `tenant:${tenantId}:${pattern}` : pattern;
      const keys = await redisClient.keys(fullPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  },
};

module.exports = { redisClient, cacheHelper };