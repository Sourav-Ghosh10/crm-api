const { ForbiddenError } = require('../utils/errors');

/**
 * IP Whitelist middleware
 * Checks if the request IP is in the user's allowed IPs list
 */
const ipWhitelist = (req, res, next) => {
  try {
    // Skip if user doesn't have IP restrictions
    if (!req.user || !req.user.allowedIPs || req.user.allowedIPs.length === 0) {
      return next();
    }

    // Get client IP
    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip;

    // Check if IP is in whitelist
    const isAllowed = req.user.allowedIPs.some(
      (allowedIP) =>
        // Simple match for now - can be enhanced with IP range matching
        clientIP === allowedIP || clientIP.includes(allowedIP)
    );

    if (!isAllowed) {
      throw new ForbiddenError(`Access denied from IP: ${clientIP}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { ipWhitelist };
