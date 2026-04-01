const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, EMPLOYMENT_TYPES, DEFAULT_LEAVE_BALANCE } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    personalInfo: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      },
      phone: {
        type: String,
        trim: true,
      },
      dateOfBirth: Date,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
      },
    },
    employment: {
      role: {
        type: String,
        default: USER_ROLES.EMPLOYEE,
      },
      roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        default: null,
      },
      department: String,
      designation: String,
      dateOfJoining: Date,
      employmentType: {
        type: String,
        enum: Object.values(EMPLOYMENT_TYPES),
        default: EMPLOYMENT_TYPES.FULL_TIME,
      },
      reportingManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
      },
      location: String,
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      workingHours: {
        startTime: String,
        endTime: String,
        weeklyOff: [String],
      },
    },
    permissions: {
      modules: [String],
      canApproveLeave: { type: Boolean, default: false },
      canApproveReimbursement: { type: Boolean, default: false },
      canManageSchedule: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
    },
    allowedIPs: [String],
    leaveBalance: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isHolidayApplicable: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    passwordChangedAt: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,
    googleId: {
      type: String,
      sparse: true,
    },
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ isActive: 1, 'employment.role': 1 });
userSchema.index({ 'employment.department': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for subordinates
userSchema.virtual('subordinates', {
  ref: 'User',
  localField: '_id',
  foreignField: 'employment.reportingManager',
});

// Pre-save hook for hierarchy validation
userSchema.pre('save', async function () {
  if (this.isModified('employment.reportingManager') && this.employment.reportingManager) {
    if (this.employment.reportingManager.equals(this._id)) {
      throw new Error('User cannot report to themselves.');
    }

    const manager = await this.model('User').findById(this.employment.reportingManager);
    if (manager) {
      // Check if the current user appears in the manager's reporting chain
      const chain = await manager.getReportingChain();
      const isCircular = chain.some((u) => u._id.equals(this._id));
      if (isCircular) {
        throw new Error('Circular reporting hierarchy detected.');
      }
    }
  }
});

// Pre-save hook for password hashing
userSchema.pre('save', async function () {
  // console.log('User pre-save hook entered', this._id);
  if (!this.isModified('passwordHash')) {
    // console.log('Password hash not modified');
    return;
  }
  // console.log('Hashing password');

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  this.passwordChangedAt = new Date();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to get reporting chain
userSchema.methods.getReportingChain = async function () {
  const chain = [this];
  let currentUser = this;

  while (currentUser.employment && currentUser.employment.reportingManager) {
    const manager = await this.model('User').findById(currentUser.employment.reportingManager);
    if (!manager) break;

    // Prevent infinite loop
    if (chain.some((u) => u._id.equals(manager._id))) break;

    chain.push(manager);
    currentUser = manager;
  }
  return chain;
};

// Static method for finding active users
userSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
