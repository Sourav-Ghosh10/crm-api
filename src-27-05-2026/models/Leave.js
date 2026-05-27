const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      // enum: ['casual', 'sick', 'earned', 'compOff', 'unpaid'],
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    halfDay: {
      type: Boolean,
      default: false,
    },
    halfDayType: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    attachments: [String],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    approvalFlow: [
      {
        approverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        approverRole: String,
        action: {
          type: String,
          enum: ['approved', 'rejected'],
        },
        actionDate: Date,
        comments: String,
      },
    ],
    autoApproved: {
      type: Boolean,
      default: false,
    },
    autoApprovalReason: String,
    notificationsSent: [
      {
        recipientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        notificationType: String,
        sentAt: Date,
      },
    ],
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, createdAt: -1 });

// Ensure end date is after start date
leaveSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'End date must be greater than or equal to start date');
  }
});

// Static method to find overlapping leaves
leaveSchema.statics.findOverlapping = function (employeeId, startDate, endDate, excludeId = null) {
  const query = {
    employeeId,
    status: { $in: ['pending', 'approved'] },
    $and: [
      { startDate: { $lte: new Date(endDate) } },
      { endDate: { $gte: new Date(startDate) } },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;