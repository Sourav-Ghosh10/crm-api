const Joi = require('joi');

const createDesignationSchema = Joi.object({
    title: Joi.string().required().trim().messages({
        'string.empty': 'Designation title is required',
    }),

    description: Joi.string().allow('', null).trim(),
    isActive: Joi.boolean().default(true),
});

const updateDesignationSchema = Joi.object({
    title: Joi.string().trim(),
    description: Joi.string().allow('', null).trim(),
    isActive: Joi.boolean(),
}).min(1);

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

module.exports = {
    createDesignationSchema,
    updateDesignationSchema,
    toggleStatusSchema,
};
