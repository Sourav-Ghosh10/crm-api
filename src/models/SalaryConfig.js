const mongoose = require('mongoose');

const salaryConfigItemSchema = new mongoose.Schema({
  masterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllowanceDeductionMaster',
    required: true,
  },
  overrideValue: { type: Number, default: null }, // null = use master default
  isActive: { type: Boolean, default: true },
});

const salaryConfigSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    monthlyCTC: { type: Number, min: 0 },
    basicSalary: { type: Number, min: 0 }, // Legacy support
    effectiveFrom: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
    items: [salaryConfigItemSchema],
  },
  { timestamps: true }
);

salaryConfigSchema.index({ employeeId: 1, isActive: 1 });
salaryConfigSchema.index({ employeeId: 1, effectiveFrom: -1 });

module.exports = mongoose.model('SalaryConfig', salaryConfigSchema);
