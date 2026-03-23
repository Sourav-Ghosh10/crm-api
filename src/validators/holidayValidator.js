const Joi = require('joi');

const holidayQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    isActive: Joi.boolean(),
    search: Joi.string().max(100),
    year: Joi.number().integer().min(1900).max(2100),
    month: Joi.number().integer().min(1).max(12),
});

const createHolidaySchema = Joi.object({
    name: Joi.string().required().trim().messages({
        'any.required': 'Holiday name is required',
        'string.empty': 'Holiday name cannot be empty',
    }),
    date: Joi.date().required().messages({
        'any.required': 'Holiday date is required',
        'date.base': 'Invalid date format',
    }),
    description: Joi.string().allow('', null).trim(),
    isRecurring: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
});

const updateHolidaySchema = Joi.object({
    name: Joi.string().trim(),
    date: Joi.date(),
    description: Joi.string().allow('', null).trim(),
    isRecurring: Joi.boolean(),
    isActive: Joi.boolean(),
}).min(1);

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

module.exports = {
    holidayQuerySchema,
    createHolidaySchema,
    updateHolidaySchema,
    toggleStatusSchema,
};
