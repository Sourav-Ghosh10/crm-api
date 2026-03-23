const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  // console.error('SERVER ERROR:', err); // Debugging
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${field} already exists`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Custom AppError
  if (err.isOperational) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unknown errors (programming errors)
  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message;

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { errorHandler };
