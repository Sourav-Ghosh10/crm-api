const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const generateAccessToken = (userId, sessionId, options = {}) => {
  const payload = {
    userId,
    sessionId,
    type: 'access',
  };

  const isEmployee = typeof options === 'boolean'
    ? options
    : Boolean(options.isEmployee || options.neverExpire);

  const signOptions = {};

  if (isEmployee) {
    const employeeExpiry = process.env.JWT_EMPLOYEE_EXPIRES_IN || '100y';
    if (employeeExpiry !== 'never' && employeeExpiry !== 'none' && employeeExpiry !== '0') {
      signOptions.expiresIn = employeeExpiry;
    }
  } else if (options.expiresIn) {
    signOptions.expiresIn = options.expiresIn;
  } else {
    signOptions.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  return jwt.sign(payload, process.env.JWT_SECRET, signOptions);
};

const generateRefreshToken = (userId, sessionId, options = {}) => {
  const payload = {
    userId,
    sessionId,
    type: 'refresh',
  };

  const isEmployee = typeof options === 'boolean'
    ? options
    : Boolean(options.isEmployee || options.neverExpire);

  const signOptions = {};

  if (isEmployee) {
    const employeeRefreshExpiry = process.env.JWT_EMPLOYEE_REFRESH_EXPIRES_IN || '100y';
    if (employeeRefreshExpiry !== 'never' && employeeRefreshExpiry !== 'none' && employeeRefreshExpiry !== '0') {
      signOptions.expiresIn = employeeRefreshExpiry;
    }
  } else if (options.expiresIn) {
    signOptions.expiresIn = options.expiresIn;
  } else {
    signOptions.expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, signOptions);
};

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const generateSessionId = () => uuidv4();

const decodeToken = (token) => jwt.decode(token);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSessionId,
  decodeToken,
};
