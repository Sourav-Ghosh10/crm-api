const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    projectName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: String,
    endTime: String,
    hoursWorked: {
      type: Number,
      required: true,
      min: [0, 'Hours must be positive'],
      max: [24, 'Hours cannot exceed 24'],
    },
    taskDescription: {
      type: String,
      required: true,
      maxlength: [1000, 'Task description cannot exceed 1000 characters'],
    },
    billable: {
      type: Boolean,
      default: true,
    },
    hourlyRate: Number,
    totalAmount: Number,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'invoiced'],
      default: 'draft',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
timesheetSchema.index({ employeeId: 1, date: 1 });
timesheetSchema.index({ clientId: 1, status: 1 });

// Pre-save hook to calculate total amount
timesheetSchema.pre('save', function (next) {
  if (this.billable && this.hoursWorked && this.hourlyRate) {
    this.totalAmount = this.hoursWorked * this.hourlyRate;
  }
  next();
});

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

module.exports = Timesheet;
