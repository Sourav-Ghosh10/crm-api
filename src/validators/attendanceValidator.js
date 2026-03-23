const Joi = require('joi');
const { objectIdSchema } = require('./commonValidator');

const checkInSchema = Joi.object({
  deviceInfo: Joi.string().max(200),
  remarks: Joi.string().max(500),
});

const checkOutSchema = Joi.object({
  deviceInfo: Joi.string().max(200),
});

const attendanceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  employeeId: objectIdSchema,
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  status: Joi.string().valid('present', 'absent', 'half-day', 'on-leave', 'holiday', 'weekend', 'Late'),
  search: Joi.string().max(100),
  department: Joi.string().max(100),
  designation: Joi.string().max(100),
  isClockedIn: Joi.boolean(),
  isOnBreak: Joi.boolean(),
});

const correctLogoutSchema = Joi.object({
  shiftId: objectIdSchema.required(),
  logoutTime: Joi.date().iso().required(),
  shiftDate: Joi.string().required(),
  reason: Joi.string().required().max(200),
  remarks: Joi.string().allow('').max(500),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  attendanceQuerySchema,
  correctLogoutSchema,
};
