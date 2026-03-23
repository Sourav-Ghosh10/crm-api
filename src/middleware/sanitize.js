/**
 * Sanitize middleware to remove potentially harmful characters
 * This is already handled by express-mongo-sanitize and xss-clean packages
 * but this is a placeholder for additional custom sanitization if needed
 */
const sanitize = (req, res, next) => {
  // Additional custom sanitization logic can be added here
  // For now, rely on express-mongo-sanitize and xss-clean in app.js
  next();
};

module.exports = { sanitize };
