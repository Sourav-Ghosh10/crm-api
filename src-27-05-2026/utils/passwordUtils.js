const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (candidatePassword, hashedPassword) =>
  bcrypt.compare(candidatePassword, hashedPassword);

const validatePasswordStrength = (password) => {
  const minLength = parseInt(process.env.MIN_PASSWORD_LENGTH, 10) || 8;

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for special character
  if (!/[@$!%*?&]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (@$!%*?&)',
    };
  }

  return { valid: true };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
};
