const mongoose = require('mongoose');

const masterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['ALLOWANCE', 'DEDUCTION'],
      required: true,
      index: true,
    },
    calculationType: {
      type: String,
      enum: ['FIXED', 'PERCENTAGE', 'SLAB'],
      default: 'FIXED',
    },
    value: { type: Number, required: true, min: 0 },
    percentageOf: {
      type: String,
      enum: ['CTC', 'BASIC', 'GROSS'],
      default: 'CTC',
    },
    slabs: [
      {
        minAmount: { type: Number, required: true },
        maxAmount: { type: Number }, // null means no upper limit
        fixedAmount: { type: Number, required: true },
      }
    ],
    isBalancing: {
      type: Boolean,
      default: false,
    },
    isTaxable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AllowanceDeductionMaster', masterSchema);
