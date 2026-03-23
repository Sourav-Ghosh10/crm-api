const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const cacheService = {
  get: async (key) => {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return null;

      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  set: async (key, value, ttlSeconds = 300) => {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return;

      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  del: async (key) => {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return;

      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  },

  delPattern: async (pattern) => {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return;

      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  },
};

module.exports = cacheService;
