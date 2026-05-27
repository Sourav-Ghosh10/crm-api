const winston = require('winston');
const path = require('path');
const fs = require('fs');

// --- 1. Configuration Constants ---

const LOG_DIR = 'logs';
const SERVICE_NAME = 'pulse-ops-api';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_LOG_FILES = 5;

// --- 2. Logger Formats ---

/**
 * Standard format for file logging (JSON for structured logging).
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Crucial for full error visibility
  winston.format.splat(), // Handles string interpolation (e.g., logger.info('Message %s', data))
  winston.format.json()
);

/**
 * Enhanced format for console logging (readable, colored, and concise).
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, service, stack }) => {
    // --- FIX IS HERE ---
    let logMessage = message;
    if (typeof logMessage === 'object' && logMessage !== null) {
      // Pretty print the object to make it readable in the console
      logMessage = JSON.stringify(logMessage, null, 2);
    }
    // --------------------

    const formattedStack = stack ? `\n${stack}` : '';

    return `[${timestamp}] [${service}] ${level}: ${logMessage}${formattedStack}`;
  })
);

// --- 3. Directory Setup (Synchronous is acceptable for initialization) ---

if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR);
    // Avoid using console to satisfy linting; use process.stdout
    process.stdout.write(`Log directory created: ${LOG_DIR}\n`);
  } catch (err) {
    process.stderr.write(`Failed to create log directory ${LOG_DIR}: ${err}\n`);
    // It's usually better to continue, but logging won't be saved to file
  }
}

// --- 4. Define Transports ---

const transports = [
  // 4.1. Error Logs (File)
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat,
    tailable: true, // Start writing from the end of the file
  }),

  // 4.2. All Logs (File)
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat,
    tailable: true,
  }),
];

// 4.3. Console Transport (Only in Non-Production)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'debug', // Show more in development
      format: consoleFormat,
    })
  );
}

// --- 5. Create Logger Instance ---

const logger = winston.createLogger({
  // Set the overall minimum level
  level: process.env.LOG_LEVEL || 'info',

  // Default metadata to attach to every log entry
  defaultMeta: { service: SERVICE_NAME },

  // Do not exit on handled exceptions, allowing the process to continue running
  // and letting tools like PM2 or Kubernetes restart the application.
  exitOnError: false,

  transports,
});

module.exports = logger;
