const generateEmployeeId = (prefix = 'EMP') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const sanitizeObject = (obj, allowedFields) => {
  const sanitized = {};
  allowedFields.forEach((field) => {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  });
  return sanitized;
};

const capitalizeFirstLetter = (string) =>
  string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();

const generateRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const removeUndefined = (obj) => {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

module.exports = {
  generateEmployeeId,
  sanitizeObject,
  capitalizeFirstLetter,
  generateRandomString,
  sleep,
  isValidObjectId,
  removeUndefined,
};
