const Joi = require('joi');
const { paginationSchema } = require('./commonValidator');

const createBreakTypeSchema = Joi.object({
    name: Joi.string().trim().required(),
    code: Joi.string().trim().uppercase().required(),
    description: Joi.string().allow(''),
    maxDuration: Joi.number().min(0).default(0),
    isPaid: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
});

const updateBreakTypeSchema = Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().trim().uppercase(),
    description: Joi.string().allow(''),
    maxDuration: Joi.number().min(0),
    isPaid: Joi.boolean(),
    isActive: Joi.boolean(),
});


const breakTypeQuerySchema = paginationSchema.keys({
    search: Joi.string().allow(''),
    isActive: Joi.boolean(),
});

module.exports = {
    createBreakTypeSchema,
    updateBreakTypeSchema,
    breakTypeQuerySchema,
};
