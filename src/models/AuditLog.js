const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'APPROVE',
        'REJECT',
        'OTHER',
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'user',
        'attendance',
        'leave',
        'reimbursement',
        'reimbursementType',
        'client',
        'timesheet',
        'announcement',
        'schedule',
        'holiday',
        'other',
      ],
    },
    entityId: mongoose.Schema.Types.ObjectId,
    description: {
      type: String,
      required: true,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Indexes
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
