const mongoose = require('mongoose');

const breakTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Break type name is required'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Break type code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        maxDuration: {
            type: Number, // in minutes
            default: 0,
            min: 0,
        },
        isPaid: {
            type: Boolean,
            default: false,
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

const BreakType = mongoose.model('BreakType', breakTypeSchema);

module.exports = BreakType;
