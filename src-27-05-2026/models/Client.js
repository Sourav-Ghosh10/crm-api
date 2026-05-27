const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    contactPerson: {
      name: String,
      designation: String,
      email: String,
      phone: String,
    },
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    projects: [
      {
        name: String,
        description: String,
        startDate: Date,
        endDate: Date,
        status: {
          type: String,
          enum: ['active', 'completed', 'on-hold', 'cancelled'],
          default: 'active',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index for searching
clientSchema.index({ name: 'text', companyName: 'text' });
clientSchema.index({ email: 1 });
clientSchema.index({ isActive: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
