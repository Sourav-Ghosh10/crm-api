const Joi = require('joi');
const { objectIdSchema, paginationSchema } = require('./commonValidator');

// Leave Type Schemas
const createLeaveTypeSchema = Joi.object({
    name: Joi.string().trim().required(),
    code: Joi.string().trim().uppercase().required(),
    description: Joi.string().allow(''),
    isPaid: Joi.boolean().default(true),
    defaultAmount: Joi.number().min(0).default(0),
    maxCarryForward: Joi.number().min(0).default(0),
    resetFrequency: Joi.string().valid('monthly', 'yearly').default('yearly'),
    applicableDepartments: Joi.array().items(Joi.string()).default(['all']),
    applicableDesignations: Joi.array().items(Joi.string()).default(['all']),
    isActive: Joi.boolean().default(true),
});

const updateLeaveTypeSchema = Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().trim().uppercase(),
    description: Joi.string().allow(''),
    isPaid: Joi.boolean(),
    defaultAmount: Joi.number().min(0),
    maxCarryForward: Joi.number().min(0),
    resetFrequency: Joi.string().valid('monthly', 'yearly'),
    applicableDepartments: Joi.array().items(Joi.string()),
    applicableDesignations: Joi.array().items(Joi.string()),
    isActive: Joi.boolean(),
});

const leaveTypeQuerySchema = paginationSchema.keys({
    search: Joi.string().allow(''),
    isActive: Joi.boolean(),
});

module.exports = {
    createLeaveTypeSchema,
    updateLeaveTypeSchema,
    leaveTypeQuerySchema,
};
