const mongoose = require('mongoose');
const { REIMBURSEMENT_STATUS, REIMBURSEMENT_TYPES, PAYMENT_MODES } = require('../config/constants');

const reimbursementSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    reimbursementTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReimbursementType',
      required: true,
    },

    reimbursementType: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: Object.values(REIMBURSEMENT_STATUS),
      default: REIMBURSEMENT_STATUS.PENDING,
      index: true,
    },

    approval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
      remarks: String,
      rejectionReason: String,
    },

    payment: {
      paidAmount: Number,
      paidAt: Date,
      paymentMode: {
        type: String,
        enum: Object.values(PAYMENT_MODES),
      },
      transactionId: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes
reimbursementSchema.index({ employeeId: 1, status: 1 });
reimbursementSchema.index({ expenseDate: 1 });

const Reimbursement = mongoose.model('Reimbursement', reimbursementSchema);

module.exports = Reimbursement;
