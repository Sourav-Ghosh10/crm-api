const mongoose = require('mongoose');

const payslipItemSchema = new mongoose.Schema({
  masterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllowanceDeductionMaster',
  },
  name: { type: String, required: true },   // snapshot from master
  code: { type: String, required: true },   // snapshot from master
  type: { type: String, enum: ['ALLOWANCE', 'DEDUCTION'], required: true },
  amount: { type: Number, required: true, min: 0 },
  isManualOverride: { type: Boolean, default: false },
});

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    salaryConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryConfig',
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    monthlyCTC: { type: Number, min: 0 },
    basicSalary: { type: Number, min: 0 }, // Legacy support
    items: [payslipItemSchema],             // all allowances + deductions
    grossEarnings: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    totalDays: { type: Number, required: true },
    daysWorked: { type: Number, required: true },
    lopDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'FINALIZED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    isManual: { type: Boolean, default: false },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

payslipSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payslipSchema.index({ year: 1, month: 1, status: 1 });

module.exports = mongoose.model('Payslip', payslipSchema);
