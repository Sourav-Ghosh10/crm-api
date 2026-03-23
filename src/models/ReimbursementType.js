const mongoose = require('mongoose');

const reimbursementTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Reimbursement type name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        maxAmount: {
            type: Number,
            min: [0, 'Max amount must be positive'],
        },
        requiresReceipt: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for name and isActive
reimbursementTypeSchema.index({ name: 1 });

const ReimbursementType = mongoose.model('ReimbursementType', reimbursementTypeSchema);

module.exports = ReimbursementType;
