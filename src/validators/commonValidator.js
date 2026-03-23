const Joi = require('joi');

// Common object ID schema
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

// ID param validation
const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

// Pagination query schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

// Date range schema
const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
});

module.exports = {
  objectIdSchema,
  idParamSchema,
  paginationSchema,
  dateRangeSchema,
};
