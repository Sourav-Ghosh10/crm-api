const Joi = require('joi');
const { objectIdSchema, paginationSchema } = require('./commonValidator');

const createLeaveSchema = Joi.object({
  leaveType: Joi.string()
    // .valid('casual', 'sick', 'earned', 'compOff', 'unpaid')
    .required()
    .messages({
      'any.only': 'Invalid leave type',
      'any.required': 'Leave type is required',
    }),

  startDate: Joi.date().iso().required().messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'date.min': 'End date use be equal to or after start date',
    'any.required': 'End date is required',
  }),
  halfDay: Joi.boolean().default(false),
  reason: Joi.string().max(500).required().messages({
    'string.max': 'Reason cannot exceed 500 characters',
    'any.required': 'Reason is required',
  }),
  attachments: Joi.array().items(Joi.string().uri()).max(5),
});

const updateLeaveStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  rejectionReason: Joi.string().max(500).when('status', {
    is: 'rejected',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const leaveQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled'),
  userId: objectIdSchema,
  leaveType: Joi.string().valid('casual', 'sick', 'earned', 'compOff', 'unpaid'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  search: Joi.string().allow(''),
});

const updateBalanceSchema = Joi.object({
  leaveBalance: Joi.alternatives().try(
    // Simple map: { "sick": 10, "annual": 15 }
    Joi.object().pattern(Joi.string(), Joi.number().min(0).allow(null)),
    // Complex object from GET response: { "userId": "...", "balances": [...] }
    Joi.object({
      balances: Joi.array().items(
        Joi.object({
          code: Joi.string().required(),
          currentBalance: Joi.number().min(0).allow(null),
        }).unknown(true)
      ).required(),
    }).unknown(true)
  ).required(),
});

const cancelLeaveSchema = Joi.object({
  cancelReason: Joi.string().max(500).optional(),
});

module.exports = {
  createLeaveSchema,
  updateLeaveStatusSchema,
  leaveQuerySchema,
  updateBalanceSchema,
  cancelLeaveSchema,
};
