const Joi = require('joi');
const { objectIdSchema } = require('./commonValidator');

// Query parameters for listing users
const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string(),
  department: Joi.string(),
  employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern'),
  isActive: Joi.boolean(),
  search: Joi.string().max(100),
  sortBy: Joi.string().valid('firstName', 'lastName', 'createdAt', 'employeeId'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

// Status toggle query schema
const statusToggleSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

// Create user schema
const createUserSchema = Joi.object({
  employeeId: Joi.string()
    .uppercase()
    .trim()
    .required(),
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
  personalInfo: Joi.object({
    firstName: Joi.string().trim().max(50).required(),
    lastName: Joi.string().trim().max(50).required(),
    email: Joi.string().email().lowercase().trim().required(),
    phone: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/),
    dateOfBirth: Joi.date().max('now').iso(),
    address: Joi.object({
      street: Joi.string().max(200),
      city: Joi.string().max(100),
      state: Joi.string().max(100),
      country: Joi.string().max(100),
      zipCode: Joi.string().max(20),
    }),
    emergencyContact: Joi.object({
      name: Joi.string().max(100),
      relationship: Joi.string().max(50),
      phone: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/),
    }),
  }).required(),
  employment: Joi.object({
    role: Joi.string().default('employee'),
    roleId: objectIdSchema.allow(null),
    department: Joi.string().max(100),
    designation: Joi.string().max(100),
    dateOfJoining: Joi.date().iso(),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern').default('full-time'),
    reportingManager: objectIdSchema.allow(null),
    location: Joi.string().max(100),
    timezone: Joi.string().max(100).default('Asia/Kolkata'),
    workingHours: Joi.object({
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      weeklyOff: Joi.array().items(
        Joi.string().valid(
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        )
      ),
    }),
  }),
  allowedIPs: Joi.array().items(Joi.string().ip({ version: ['ipv4', 'ipv6'] })),
  leaveBalance: Joi.object({
    casual: Joi.number().integer().min(0).max(100),
    sick: Joi.number().integer().min(0).max(100),
    earned: Joi.number().integer().min(0).max(100),
    compOff: Joi.number().integer().min(0).max(100),
  }),
  isAdmin: Joi.boolean().default(false),
  isHolidayApplicable: Joi.boolean(),
  permissions: Joi.object({
    modules: Joi.array().items(Joi.string()),
    canApproveLeave: Joi.boolean(),
    canApproveReimbursement: Joi.boolean(),
    canManageSchedule: Joi.boolean(),
    canViewReports: Joi.boolean(),
  }),
});

// Update user schema (all fields optional, password and employeeId forbidden)
const updateUserSchema = createUserSchema.fork(
  ['employeeId', 'username', 'password', 'personalInfo', 'personalInfo.firstName', 'personalInfo.lastName', 'personalInfo.email', 'employment', 'allowedIPs', 'leaveBalance', 'isAdmin', 'isHolidayApplicable', 'permissions'],
  (schema) => schema.optional()
)
  .keys({
    password: Joi.any().forbidden(),
    employeeId: Joi.any().forbidden(),
  });

const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

module.exports = {
  userQuerySchema,
  createUserSchema,
  updateUserSchema,
  idParamSchema,
  statusToggleSchema,
};
