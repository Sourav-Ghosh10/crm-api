const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Leave type name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Leave type code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: String,
        isPaid: {
            type: Boolean,
            default: true,
        },
        defaultAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxCarryForward: {
            type: Number,
            default: 0,
            min: 0,
        },
        resetFrequency: {
            type: String,
            enum: ['monthly', 'yearly'],
            required: true,
            default: 'yearly',
        },
        applicableDepartments: {
            type: [String],
            default: ['all'],
        },
        applicableDesignations: {
            type: [String],
            default: ['all'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

module.exports = LeaveType;
