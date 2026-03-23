const Joi = require('joi');
const { paginationSchema } = require('./commonValidator');

const createReimbursementTypeSchema = Joi.object({
    name: Joi.string().trim().required().messages({
        'any.required': 'Reimbursement type name is required',
    }),
    description: Joi.string().trim().allow(''),
    maxAmount: Joi.number().min(0).allow(null),
    requiresReceipt: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
});

const updateReimbursementTypeSchema = Joi.object({
    name: Joi.string().trim(),
    description: Joi.string().trim().allow(''),
    maxAmount: Joi.number().min(0).allow(null),
    requiresReceipt: Joi.boolean(),
    isActive: Joi.boolean(),
});

const reimbursementTypeQuerySchema = paginationSchema.keys({
    search: Joi.string().allow(''),
    isActive: Joi.boolean(),
});

module.exports = {
    createReimbursementTypeSchema,
    updateReimbursementTypeSchema,
    reimbursementTypeQuerySchema,
};
