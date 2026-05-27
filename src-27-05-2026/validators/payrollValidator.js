const Joi = require('joi');

const payrollValidator = {
  // Allowance Deduction Master
  createMasterSchema: Joi.object({
    name: Joi.string().required().trim(),
    code: Joi.string().required().uppercase().trim(),
    type: Joi.string().valid('ALLOWANCE', 'DEDUCTION').required(),
    calculationType: Joi.string().valid('FIXED', 'PERCENTAGE', 'SLAB').default('FIXED'),
    percentageOf: Joi.string().valid('CTC', 'BASIC', 'GROSS').default('CTC'),
    value: Joi.number().min(0).required(),
    slabs: Joi.array().items(Joi.object({
      minAmount: Joi.number().min(0).required(),
      maxAmount: Joi.number().min(0).allow(null),
      fixedAmount: Joi.number().min(0).required(),
    })).optional(),
    isBalancing: Joi.boolean().default(false),
    isTaxable: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().default(0),
  }),

  updateMasterSchema: Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().uppercase().trim(),
    type: Joi.string().valid('ALLOWANCE', 'DEDUCTION'),
    calculationType: Joi.string().valid('FIXED', 'PERCENTAGE', 'SLAB'),
    percentageOf: Joi.string().valid('CTC', 'BASIC', 'GROSS'),
    value: Joi.number().min(0),
    slabs: Joi.array().items(Joi.object({
      minAmount: Joi.number().min(0).required(),
      maxAmount: Joi.number().min(0).allow(null),
      fixedAmount: Joi.number().min(0).required(),
    })),
    isBalancing: Joi.boolean(),
    isTaxable: Joi.boolean(),
    isActive: Joi.boolean(),
    displayOrder: Joi.number(),
  }),

  // Salary Config
  createSalaryConfigSchema: Joi.object({
    employeeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    monthlyCTC: Joi.number().min(0).required(),
    effectiveFrom: Joi.date().required(),
    isActive: Joi.boolean().default(true),
    items: Joi.array().items(Joi.object({
      masterId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      overrideValue: Joi.number().min(0).allow(null),
      isActive: Joi.boolean().default(true),
    })),
  }),

  updateSalaryConfigSchema: Joi.object({
    monthlyCTC: Joi.number().min(0),
    effectiveFrom: Joi.date(),
    isActive: Joi.boolean(),
    items: Joi.array().items(Joi.object({
      masterId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      overrideValue: Joi.number().min(0).allow(null),
      isActive: Joi.boolean(),
    })),
  }),

  // Payslip
  generatePayslipSchema: Joi.object({
    employeeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().integer().required(),
    totalDays: Joi.number().min(1).max(31).required(),
    daysWorked: Joi.number().min(0).max(31).required(),
    lopDays: Joi.number().min(0).default(0),
  }),

  updatePayslipStatusSchema: Joi.object({
    status: Joi.string().valid('DRAFT', 'FINALIZED', 'CANCELLED').required(),
  }),
};

module.exports = payrollValidator;
