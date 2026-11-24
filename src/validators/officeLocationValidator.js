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
        phone: Joi.string().trim().max(20).allow('', null),
        email: Joi.string().email().trim().lowercase().max(100).allow('', null),
    }).allow(null),
    isHeadquarters: Joi.boolean(),
    isActive: Joi.boolean(),
    timezone: Joi.string().trim().max(50),
    coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).allow(null, ''),
        longitude: Joi.number().min(-180).max(180).allow(null, ''),
    }).allow(null),
    radius: Joi.number().min(5).max(50000).allow(null, ''),
    geofencingEnabled: Joi.boolean(),
    geofencingMobile: Joi.boolean(),
    geofencingDesktop: Joi.boolean(),
    ipRestrictionEnabled: Joi.boolean(),
    allowedIps: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim()).allow(null),
        Joi.string().trim().allow('', null)
    ),
    ipRestrictionMobile: Joi.boolean(),
    ipRestrictionDesktop: Joi.boolean(),
    leaveNotificationEmails: Joi.alternatives().try(
        Joi.array().items(Joi.string().email().trim().lowercase()).allow(null),
        Joi.string().trim().allow('', null)
    ),
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
        phone: Joi.string().trim().max(20).allow('', null),
        email: Joi.string().email().trim().lowercase().max(100).allow('', null),
    }).allow(null),
    isHeadquarters: Joi.boolean(),
    isActive: Joi.boolean(),
    timezone: Joi.string().trim().max(50),
    coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).allow(null, ''),
        longitude: Joi.number().min(-180).max(180).allow(null, ''),
    }).allow(null),
    radius: Joi.number().min(5).max(50000).allow(null, ''),
    geofencingEnabled: Joi.boolean(),
    geofencingMobile: Joi.boolean(),
    geofencingDesktop: Joi.boolean(),
    ipRestrictionEnabled: Joi.boolean(),
    allowedIps: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim()).allow(null),
        Joi.string().trim().allow('', null)
    ),
    ipRestrictionMobile: Joi.boolean(),
    ipRestrictionDesktop: Joi.boolean(),
    leaveNotificationEmails: Joi.alternatives().try(
        Joi.array().items(Joi.string().email().trim().lowercase()).allow(null),
        Joi.string().trim().allow('', null)
    ),
}).min(1);

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

module.exports = {
    createOfficeLocationSchema,
    updateOfficeLocationSchema,
    toggleStatusSchema,
};
