const mongoose = require('mongoose');
const { Schema } = mongoose;

const officeLocationSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Office location name is required'],
        unique: true,
        trim: true,
    },
    address: {
        street: { type: String, required: [true, 'Street address is required'], trim: true },
        city: { type: String, required: [true, 'City is required'], trim: true },
        state: { type: String, required: [true, 'State is required'], trim: true },
        country: { type: String, required: [true, 'Country is required'], trim: true, default: 'India' },
        zipCode: { type: String, required: [true, 'Zip code is required'], trim: true },
    },
    contactInfo: {
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
    },
    isHeadquarters: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata',
    },
    coordinates: {
        latitude: {
            type: Number,
            default: null,
        },
        longitude: {
            type: Number,
            default: null,
        },
    },
    radius: {
        type: Number,
        default: 100, // Distance in meters
    },
    geofencingEnabled: {
        type: Boolean,
        default: true,
    },
    geofencingMobile: {
        type: Boolean,
        default: true,
    },
    geofencingDesktop: {
        type: Boolean,
        default: true,
    },
    ipRestrictionEnabled: {
        type: Boolean,
        default: false,
    },
    allowedIps: {
        type: [String],
        default: [],
    },
    ipRestrictionMobile: {
        type: Boolean,
        default: true,
    },
    ipRestrictionDesktop: {
        type: Boolean,
        default: true,
    },
    leaveNotificationEmails: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false, // We'll handle updatedAt manually via pre-save hook like other models
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Pre-save hook to update the updatedAt field
officeLocationSchema.pre('save', async function () {
    this.updatedAt = Date.now();
});

const OfficeLocation = mongoose.model('OfficeLocation', officeLocationSchema);

module.exports = OfficeLocation;
