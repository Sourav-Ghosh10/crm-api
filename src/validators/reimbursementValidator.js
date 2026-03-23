const Joi = require('joi');
const { REIMBURSEMENT_TYPES, REIMBURSEMENT_STATUS, PAYMENT_MODES } = require('../config/constants');

const createReimbursementSchema = Joi.object({
    reimbursementType: Joi.string()
        .lowercase()
        .valid(...Object.values(REIMBURSEMENT_TYPES))
        .required(),
    reimbursementTypeId: Joi.string().required(),
    title: Joi.string().required().trim(),
    description: Joi.string().allow('', null).trim(),
    amount: Joi.number().min(0).required(),
    expenseDate: Joi.date().iso().required(),
    attachments: Joi.array().items(
        Joi.object({
            fileName: Joi.string().required(),
            fileUrl: Joi.string().uri({ scheme: ['http', 'https', 'data'] }).required(),
        })
    ),
});

const updateReimbursementSchema = Joi.object({
    reimbursementType: Joi.string()
        .lowercase()
        .valid(...Object.values(REIMBURSEMENT_TYPES)),
    title: Joi.string().trim(),
    description: Joi.string().allow('', null).trim(),
    amount: Joi.number().min(0),
    expenseDate: Joi.date().iso(),
    attachments: Joi.array().items(
        Joi.object({
            fileName: Joi.string().required(),
            fileUrl: Joi.string().uri({ scheme: ['http', 'https', 'data'] }).required(),
        })
    ),
});

const updateReimbursementStatusSchema = Joi.object({
    status: Joi.string()
        .lowercase()
        .valid(REIMBURSEMENT_STATUS.APPROVED, REIMBURSEMENT_STATUS.REJECTED)
        .required(),
    remarks: Joi.string().allow('', null).trim(),
    rejectionReason: Joi.string().allow('', null).trim(),
});

const payReimbursementSchema = Joi.object({
    paidAmount: Joi.number().min(0).required(),
    paymentMode: Joi.string()
        .lowercase()
        .valid(...Object.values(PAYMENT_MODES))
        .required(),
    transactionId: Joi.string().allow('', null).trim(),
    paidAt: Joi.date().iso().default(() => new Date()),
});

const reimbursementQuerySchema = Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string().lowercase().valid(...Object.values(REIMBURSEMENT_STATUS)),
    reimbursementType: Joi.string().lowercase().valid(...Object.values(REIMBURSEMENT_TYPES)),
    employeeId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    search: Joi.string().allow('', null),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
});

module.exports = {
    createReimbursementSchema,
    updateReimbursementSchema,
    updateReimbursementStatusSchema,
    payReimbursementSchema,
    reimbursementQuerySchema,
};
