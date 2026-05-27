const Joi = require('joi');

const createRoleSchema = Joi.object({
    name: Joi.string().required().trim().messages({
        'string.empty': 'Role name is required',
    }),
    description: Joi.string().allow('', null).trim(),
    permissions: Joi.array().items(Joi.string()).default([]),
    isActive: Joi.boolean().default(true),
});

const updateRoleSchema = Joi.object({
    name: Joi.string().trim(),
    description: Joi.string().allow('', null).trim(),
    permissions: Joi.array().items(Joi.string()),
    isActive: Joi.boolean(),
}).min(1);

const idParamSchema = Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'Invalid ID format',
    }),
});

module.exports = {
    createRoleSchema,
    updateRoleSchema,
    idParamSchema,
};
