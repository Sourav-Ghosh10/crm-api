const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming this is your logger utility

/**
 * Mongoose connection options for production environment.
 * @type {mongoose.ConnectOptions}
 */
const CONNECTION_OPTIONS = {
  // Limits the number of concurrent connections in the pool.
  maxPoolSize: 10,

  // Time in milliseconds to wait before retrying to select a suitable server.
  serverSelectionTimeoutMS: 5000,

  // Time in milliseconds before a socket is considered idle and closed.
  socketTimeoutMS: 45000,

  // The driver will wait for a connection to be established before sending commands.
  // Setting to true is deprecated, setting to false is the default recommended behavior.
  // useNewUrlParser: true, // No longer necessary in recent Mongoose versions
  // useUnifiedTopology: true, // No longer necessary in recent Mongoose versions
};

/**
 * Registers listeners for MongoDB connection events to improve monitoring and stability.
 * @param {boolean} [enableReconnection=false] - If true, attempts to automatically reconnect on disconnect.
 */
const registerEventListeners = (enableReconnection = false) => {
  const db = mongoose.connection;

  db.on('error', (err) => {
    logger.error('🚨 MongoDB connection error:', err);
  });

  db.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected.');

    // Optional: Reconnection logic for robustness
    if (enableReconnection) {
      logger.info('Attempting to re-establish MongoDB connection...');
      // Note: This needs to be handled carefully in production.
      // A more robust application might use a tool like 'forever' or 'pm2' for restarts,
      // or a dedicated reconnect function with backoff logic.
      setTimeout(() => {
        // We attempt to re-call the connection function, without immediate exit.
        connectDatabase(enableReconnection).catch((e) => {
          // Log error if immediate reconnect fails but don't exit the process.
          logger.error('Reconnection attempt failed:', e.message);
        });
      }, 5000);
    }
  });

  db.on('reconnected', () => {
    logger.info('✅ MongoDB reconnected successfully.');
  });

  db.on('connected', () => {
    // This event fires on initial successful connection and also on successful reconnection.
    logger.info('🟢 MongoDB connection established.');
  });

  db.on('open', () => {
    require('fs').writeFileSync('db_info.txt', `Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}\n`);
    logger.info(`🔗 MongoDB connection open. Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}`);
  });

  // Graceful shutdown on application termination (e.g., Ctrl+C or kill signal)
  process.on('SIGINT', async () => {
    logger.info('🛑 SIGINT received. Closing MongoDB connection...');
    await mongoose.connection.close();
    logger.info('👋 MongoDB connection closed. Exiting process.');
    process.exit(0);
  });
};

/**
 * Establishes a connection to the MongoDB database.
 * @param {boolean} [enableReconnection=false] - If true, sets up an automatic reconnection attempt on disconnect.
 */
async function connectDatabase(enableReconnection = false) {
  if (!process.env.MONGODB_URI) {
    logger.error('❌ MONGODB_URI environment variable is not set!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, CONNECTION_OPTIONS);

    // Register events only after initial successful connection
    registerEventListeners(enableReconnection);

    logger.info('✨ Initial MongoDB connection attempt succeeded.');
    // The 'connected' event listener registered in registerEventListeners will fire next.
  } catch (error) {
    // Initial connection failed: Log error and exit the application cleanly
    logger.error(`🔥 Failed to connect to MongoDB at ${process.env.MONGODB_URI}.`);
    logger.error('Details:', error.message);

    // Only exit if it's the *initial* connection that failed.
    // Reconnection logic handles subsequent failures without exiting.
    if (!mongoose.connection.readyState) {
      process.exit(1);
    }
  }
}

module.exports = { connectDatabase };
