const crypto = require('crypto');
require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { configureAWS } = require('./config/aws');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Closing server gracefully...`);
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      ...reason
    } : reason
  });
  // In development, keep the process alive to see more logs if possible, 
  // but nodemon will restart anyway if we exit.
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis (optional)
    await connectRedis();

    // Configure AWS
    configureAWS();

    // Initialize Cron Jobs
    const initCronJobs = require('./jobs/cronJobs');
    initCronJobs();

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
