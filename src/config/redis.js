const redis = require('redis');
const logger = require('../utils/logger'); // Assuming this is your logger utility

/**
 * @type {redis.RedisClientType | null}
 * Global variable to hold the single Redis client instance (Singleton).
 */
let redisClientInstance = null;

/**
 * Registers all event listeners (error, connect, ready, end) on the Redis client.
 * @param {redis.RedisClientType} client - The Redis client instance.
 */
const registerEventListeners = (client) => {
  client.on('error', (err) => {
    logger.error('🚨 Redis client error:', err.message || err);
    // Important: Log the error but do not exit the process.
    // The client attempts automatic reconnection by default.
  });

  client.on('connect', () => {
    logger.info('🟢 Redis client connecting...');
  });

  client.on('ready', () => {
    logger.info('✅ Redis client ready and successfully connected.');
  });

  client.on('end', () => {
    logger.warn('⚠️ Redis client disconnected.');
  });

  client.on('reconnecting', (attempt) => {
    const attemptCount = attempt?.attempt || attempt || 'unknown';
    logger.info(`🔄 Redis client reconnecting (attempt: ${attemptCount})`);
  });
};

/**
 * Establishes a connection to the Redis server.
 * Prioritizes REDIS_URL/REDIS_URI environment variables if available.
 * @returns {Promise<redis.RedisClientType | null>} The connected Redis client or null if connection fails.
 */
const connectRedis = async () => {
  // 1. Check if client already exists (Singleton)
  if (redisClientInstance) {
    logger.info('Redis client already exists. Returning existing instance.');
    return redisClientInstance;
  }

  try {
    // 2. Configuration: Prioritize URI for cloud/production use
    const redisUri = process.env.REDIS_URL || process.env.REDIS_URI;

    let config = {};

    if (redisUri) {
      // Use URI if provided (e.g., redis://user:password@host:port)
      logger.info('Attempting to connect to Redis using URI/URL...');
      redisClientInstance = redis.createClient({ url: redisUri });
    } else {
      // Fallback to host/port/password configuration
      logger.info('Attempting to connect to Redis using host/port...');
      config = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        },
      };

      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      if (process.env.REDIS_DB) {
        config.database = parseInt(process.env.REDIS_DB, 10);
      }

      redisClientInstance = redis.createClient(config);
    }

    // 3. Register Event Listeners
    if (redisClientInstance) {
      registerEventListeners(redisClientInstance);

      // 4. Connect the client
      await redisClientInstance.connect();
    }

    // 5. Graceful Shutdown (Registered only once)
    process.on('SIGINT', async () => {
      if (redisClientInstance && redisClientInstance.isOpen) {
        logger.info('🛑 SIGINT received. Closing Redis connection...');
        await redisClientInstance.quit();
        logger.info('👋 Redis connection closed. Exiting process.');
        process.exit(0);
      }
    });

    return redisClientInstance;
  } catch (error) {
    logger.error('🔥 Redis connection failed during setup:', error.message);

    // Ensure the global instance is null on failure
    redisClientInstance = null;

    // Do not exit the process, as Redis is often an optional cache layer
    return null;
  }
};

/**
 * Returns the connected Redis client instance.
 * @returns {redis.RedisClientType | null} The Redis client instance.
 */
const getRedisClient = () => redisClientInstance;

module.exports = {
  connectRedis,
  getRedisClient,
  // Note: Exposing the client instance directly is generally discouraged,
  // prefer getRedisClient(), but kept for backward compatibility if needed.
  redisClient: redisClientInstance,
};

// Update the exported object reference when a connection is established (if used outside)
// This is a common pitfall; relying on getRedisClient() is the safer approach.
Object.defineProperty(module.exports, 'redisClient', {
  get() {
    return redisClientInstance;
  },
});
