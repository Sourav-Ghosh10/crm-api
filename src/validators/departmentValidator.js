const Joi = require('joi');

const createDepartmentSchema = Joi.object({
    name: Joi.string().required().trim().messages({
        'string.empty': 'Department name is required',
    }),
    description: Joi.string().allow('', null).trim(),
    isActive: Joi.boolean().default(true),
});

const updateDepartmentSchema = Joi.object({
    name: Joi.string().trim(),
    description: Joi.string().allow('', null).trim(),
    isActive: Joi.boolean(),
}).min(1);

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

module.exports = {
    createDepartmentSchema,
    updateDepartmentSchema,
    toggleStatusSchema,
};
