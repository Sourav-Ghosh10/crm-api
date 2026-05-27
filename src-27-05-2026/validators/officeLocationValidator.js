const Joi = require('joi');

const createOfficeLocationSchema = Joi.object({
    name: Joi.string().trim().required().max(100),
    address: Joi.object({
        street: Joi.string().trim().required().max(200),
        city: Joi.string().trim().required().max(100),
        state: Joi.string().trim().required().max(100),
        country: Joi.string().trim().required().max(100),
        zipCode: Joi.string().trim().required().max(20),
    }).required(),
    contactInfo: Joi.object({
        phone: Joi.string().trim().max(20),
        email: Joi.string().email().trim().lowercase().max(100),
    }),
    isHeadquarters: Joi.boolean(),
    isActive: Joi.boolean(),
});

const updateOfficeLocationSchema = Joi.object({
    name: Joi.string().trim().max(100),
    address: Joi.object({
        street: Joi.string().trim().max(200),
        city: Joi.string().trim().max(100),
        state: Joi.string().trim().max(100),
        country: Joi.string().trim().max(100),
        zipCode: Joi.string().trim().max(20),
    }),
    contactInfo: Joi.object({
        phone: Joi.string().trim().max(20),
        email: Joi.string().email().trim().lowercase().max(100),
    }),
    isHeadquarters: Joi.boolean(),
    isActive: Joi.boolean(),
}).min(1);

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

module.exports = {
    createOfficeLocationSchema,
    updateOfficeLocationSchema,
    toggleStatusSchema,
};
