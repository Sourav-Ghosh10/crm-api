const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
  checked: Joi.boolean().optional()
}).unknown(true);

const registerSchema = Joi.object({
  employeeId: Joi.string()
    .uppercase()
    .trim()
    .required()
    .pattern(/^EMP\d{3,}$/)
    .message('Employee ID must be in format EMP001'),
  username: Joi.string()
    .lowercase()
    .trim()
    .min(3)
    .max(50)
    .required()
    .pattern(/^[a-z0-9._-]+$/)
    .message('Username can only contain lowercase letters, numbers, and .-_'),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain uppercase, lowercase, number, and special character'),
  firstName: Joi.string().trim().max(50).required(),
  lastName: Joi.string().trim().max(50).required(),
  email: Joi.string().email().lowercase().trim().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain uppercase, lowercase, number, and special character'),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain uppercase, lowercase, number, and special character'),
});

const googleLoginSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'string.empty': 'Firebase ID token is required',
    'any.required': 'Firebase ID token is required',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
}).unknown(true);

module.exports = {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  googleLoginSchema,
};
