const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      enum: ['general', 'holiday', 'event', 'policy', 'urgent'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'department', 'role', 'specific'],
      default: 'all',
    },
    targetDepartments: [String],
    targetRoles: [String],
    targetEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ isActive: 1, expiresAt: 1 });
announcementSchema.index({ category: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
