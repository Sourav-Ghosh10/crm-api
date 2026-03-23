# Pulse Ops - Backend Development Guidelines

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [API Design](#api-design)
5. [Database Guidelines](#database-guidelines)
6. [Authentication & Authorization](#authentication--authorization)
7. [Validation](#validation)
8. [Error Handling](#error-handling)
9. [Logging](#logging)
10. [Testing](#testing)
11. [Security](#security)
12. [Performance](#performance)
13. [Git Workflow](#git-workflow)
14. [Code Review Checklist](#code-review-checklist)

---

## Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x or 20.x LTS | Runtime |
| Express.js | 4.18+ | Web Framework |
| MongoDB | 6.x | Database |
| Mongoose | 7.6+ | ODM |
| Redis | 7.x | Cache & Sessions |
| JWT | 9.0+ | Authentication |
| Joi | 17.11+ | Validation |
| Winston | 3.11+ | Logging |

---

## Project Structure

```
pulse-ops-api/
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.js         # MongoDB connection
│   │   ├── redis.js            # Redis connection
│   │   ├── aws.js              # AWS S3 config
│   │   ├── email.js            # Email service config
│   │   └── constants.js        # App constants
│   │
│   ├── models/                 # Mongoose models
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   ├── Schedule.js
│   │   ├── LeaveRequest.js
│   │   ├── Reimbursement.js
│   │   ├── Client.js
│   │   ├── Timesheet.js
│   │   ├── Announcement.js
│   │   ├── Notification.js
│   │   ├── Holiday.js
│   │   ├── AuditLog.js
│   │   └── index.js            # Export all models
│   │
│   ├── controllers/            # Request handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── attendanceController.js
│   │   ├── scheduleController.js
│   │   ├── leaveController.js
│   │   ├── reimbursementController.js
│   │   ├── clientController.js
│   │   ├── timesheetController.js
│   │   ├── announcementController.js
│   │   ├── notificationController.js
│   │   ├── reportController.js
│   │   ├── dashboardController.js
│   │   └── settingsController.js
│   │
│   ├── services/               # Business logic
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── attendanceService.js
│   │   ├── scheduleService.js
│   │   ├── leaveService.js
│   │   ├── emailService.js
│   │   ├── notificationService.js
│   │   ├── fileUploadService.js
│   │   ├── reportService.js
│   │   └── cacheService.js
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # JWT authentication
│   │   ├── authorize.js        # Role-based access
│   │   ├── validate.js         # Request validation
│   │   ├── errorHandler.js     # Global error handler
│   │   ├── rateLimiter.js      # Rate limiting
│   │   ├── ipWhitelist.js      # IP verification
│   │   ├── requestLogger.js    # Request logging
│   │   └── sanitize.js         # Input sanitization
│   │
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── attendance.routes.js
│   │   ├── schedule.routes.js
│   │   ├── leave.routes.js
│   │   ├── reimbursement.routes.js
│   │   ├── client.routes.js
│   │   ├── timesheet.routes.js
│   │   ├── announcement.routes.js
│   │   ├── notification.routes.js
│   │   ├── report.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── settings.routes.js
│   │   └── index.js            # Route aggregator
│   │
│   ├── validators/             # Joi validation schemas
│   │   ├── authValidator.js
│   │   ├── userValidator.js
│   │   ├── attendanceValidator.js
│   │   ├── scheduleValidator.js
│   │   ├── leaveValidator.js
│   │   └── commonValidator.js
│   │
│   ├── utils/                  # Utility functions
│   │   ├── logger.js           # Winston logger setup
│   │   ├── helpers.js          # General helpers
│   │   ├── dateUtils.js        # Date utilities
│   │   ├── passwordUtils.js    # Password hashing
│   │   ├── tokenUtils.js       # JWT utilities
│   │   ├── paginationUtils.js  # Pagination helper
│   │   └── responseUtils.js    # API response formatter
│   │
│   ├── jobs/                   # Scheduled jobs (cron)
│   │   ├── index.js            # Job scheduler
│   │   ├── shiftReminders.js
│   │   ├── attendanceAlerts.js
│   │   ├── reportGeneration.js
│   │   ├── birthdayReminders.js
│   │   └── cleanup.js          # Data cleanup
│   │
│   ├── app.js                  # Express app setup
│   └── server.js               # Server entry point
│
├── tests/                      # Test files
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       ├── auth.test.js
│       └── user.test.js
│
├── .env.example                # Environment template
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json
├── ecosystem.config.js         # PM2 configuration
└── README.md
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Models | PascalCase, singular | `User.js`, `LeaveRequest.js` |
| Controllers | camelCase + Controller | `userController.js` |
| Services | camelCase + Service | `userService.js` |
| Routes | camelCase + .routes | `user.routes.js` |
| Middleware | camelCase | `auth.js`, `validate.js` |
| Validators | camelCase + Validator | `userValidator.js` |
| Utilities | camelCase | `helpers.js`, `dateUtils.js` |
| Tests | Same name + .test | `userService.test.js` |

---

## Coding Standards

### JavaScript/Node.js Style Guide

```javascript
// Use ES6+ features
const express = require('express');

// Destructure imports
const { Router } = require('express');
const { validateUser, validateId } = require('../validators/userValidator');

// Use async/await (not callbacks or .then())
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true });
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

// Use const by default, let only when reassignment needed
const maxRetries = 3;
let currentRetry = 0;

// Use template literals
const message = `User ${user.firstName} created successfully`;

// Use arrow functions for callbacks
users.map(user => user.id);
users.filter(user => user.isActive);

// Use object shorthand
const user = { firstName, lastName, email };

// Use spread operator
const updatedUser = { ...existingUser, ...updates };

// Use optional chaining
const managerName = user?.employment?.reportingManager?.name;

// Use nullish coalescing
const limit = query.limit ?? 20;
```

### Naming Conventions

```javascript
// Variables and functions: camelCase
const userName = 'john';
const getUserById = async (id) => {};

// Classes and Models: PascalCase
class UserService {}
const User = mongoose.model('User', userSchema);

// Constants: UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRY_SECONDS = 3600;

// Environment variables: UPPER_SNAKE_CASE
process.env.MONGODB_URI;
process.env.JWT_SECRET;

// Boolean variables: use is, has, can, should prefix
const isActive = true;
const hasPermission = false;
const canDelete = true;

// Event handlers: use handle prefix
const handleUserCreated = (user) => {};

// Private methods (by convention): use underscore prefix
const _validatePassword = (password) => {};
```

### Function Guidelines

```javascript
// Functions should do ONE thing
// BAD: Function does too much
const processUserAndSendEmail = async (userData) => {
  const user = await User.create(userData);
  await sendWelcomeEmail(user.email);
  await logUserCreation(user.id);
  return user;
};

// GOOD: Separate concerns
const createUser = async (userData) => {
  return User.create(userData);
};

const sendWelcomeEmail = async (email) => {
  // Send email logic
};

// Orchestrate in controller
const registerUser = async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    await sendWelcomeEmail(user.email);
    await logAudit('USER_CREATED', user.id);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// Function parameters - max 3, use object for more
// BAD:
const createReport = (type, startDate, endDate, employeeId, departmentId, format) => {};

// GOOD:
const createReport = ({ type, startDate, endDate, employeeId, departmentId, format }) => {};

// Always handle errors
const getUser = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};
```

---

## API Design

### RESTful Conventions

| Action | HTTP Method | Endpoint | Example |
|--------|-------------|----------|---------|
| List | GET | /resources | GET /api/users |
| Get One | GET | /resources/:id | GET /api/users/123 |
| Create | POST | /resources | POST /api/users |
| Update | PUT | /resources/:id | PUT /api/users/123 |
| Partial Update | PATCH | /resources/:id | PATCH /api/users/123 |
| Delete | DELETE | /resources/:id | DELETE /api/users/123 |
| Action | POST | /resources/:id/action | POST /api/users/123/deactivate |

### Response Format

```javascript
// Success Response
{
  "success": true,
  "message": "Operation successful", // Optional
  "data": {
    // Response data here
  }
}

// Success with Pagination
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 100,
      "limit": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ],
    "timestamp": "2024-11-07T12:00:00.000Z"
  }
}
```

### Response Helper

```javascript
// utils/responseUtils.js
const sendSuccess = (res, data, statusCode = 200, message = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = 'Created successfully') => {
  return sendSuccess(res, data, 201, message);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

const sendPaginated = (res, data, pagination) => {
  return sendSuccess(res, {
    ...data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalRecords: pagination.total,
      limit: pagination.limit,
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPreviousPage: pagination.page > 1,
    },
  });
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
};
```

### Controller Pattern

```javascript
// controllers/userController.js
const userService = require('../services/userService');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/responseUtils');
const { NotFoundError } = require('../utils/errors');

const userController = {
  /**
   * GET /api/users
   * Get all users with pagination and filters
   */
  getUsers: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, role, department, isActive, search } = req.query;

      const result = await userService.getUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        filters: { role, department, isActive, search },
      });

      return sendPaginated(res, { users: result.users }, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:id
   * Get single user by ID
   */
  getUser: async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.params.id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/users
   * Create new user
   */
  createUser: async (req, res, next) => {
    try {
      const user = await userService.createUser(req.body, req.user.id);
      return sendCreated(res, {
        userId: user._id,
        employeeId: user.employeeId,
      }, 'User created successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id
   * Update user
   */
  updateUser: async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { userId: user._id }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/users/:id
   * Soft delete (deactivate) user
   */
  deleteUser: async (req, res, next) => {
    try {
      await userService.deactivateUser(req.params.id, req.user.id);
      return sendSuccess(res, null, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
```

### Route Definition

```javascript
// routes/user.routes.js
const { Router } = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  idParamSchema,
} = require('../validators/userValidator');

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users
router.get(
  '/',
  authorize('admin', 'hr', 'manager'),
  validate(userQuerySchema, 'query'),
  userController.getUsers
);

// GET /api/users/:id
router.get(
  '/:id',
  authorize('admin', 'hr', 'manager'),
  validate(idParamSchema, 'params'),
  userController.getUser
);

// POST /api/users
router.post(
  '/',
  authorize('admin', 'hr'),
  validate(createUserSchema),
  userController.createUser
);

// PUT /api/users/:id
router.put(
  '/:id',
  authorize('admin', 'hr'),
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  userController.updateUser
);

// DELETE /api/users/:id
router.delete(
  '/:id',
  authorize('admin'),
  validate(idParamSchema, 'params'),
  userController.deleteUser
);

module.exports = router;
```

---

## Database Guidelines

### Model Definition

```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
      select: false, // Don't include in queries by default
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
        enum: {
          values: ['admin', 'hr', 'manager', 'employee', 'client'],
          message: '{VALUE} is not a valid role',
        },
        default: 'employee',
      },
      department: String,
      designation: String,
      dateOfJoining: Date,
      employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract'],
        default: 'full-time',
      },
      reportingManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      location: String,
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
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 7 },
      earned: { type: Number, default: 15 },
      compOff: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    passwordChangedAt: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
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
userSchema.index({ employeeId: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ 'personalInfo.email': 1 }, { unique: true });
userSchema.index({ isActive: 1, 'employment.role': 1 });
userSchema.index({ 'employment.department': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Pre-save hook for password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  this.passwordChangedAt = new Date();
  next();
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

// Static method for finding active users
userSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
```

### Query Best Practices

```javascript
// services/userService.js
const User = require('../models/User');

const userService = {
  // Use lean() for read-only queries (much faster)
  getUsers: async ({ page, limit, filters }) => {
    const query = { isActive: true };

    if (filters.role) query['employment.role'] = filters.role;
    if (filters.department) query['employment.department'] = filters.department;
    if (filters.search) {
      query.$or = [
        { 'personalInfo.firstName': new RegExp(filters.search, 'i') },
        { 'personalInfo.lastName': new RegExp(filters.search, 'i') },
        { 'personalInfo.email': new RegExp(filters.search, 'i') },
        { employeeId: new RegExp(filters.search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('employment.reportingManager', 'personalInfo.firstName personalInfo.lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return { users, total };
  },

  // Use findById for single document
  getUserById: async (id) => {
    return User.findById(id)
      .select('-passwordHash')
      .populate('employment.reportingManager', 'personalInfo.firstName personalInfo.lastName')
      .lean();
  },

  // Use findByIdAndUpdate with new: true to get updated doc
  updateUser: async (id, updateData, updatedBy) => {
    // Remove fields that shouldn't be updated directly
    delete updateData.passwordHash;
    delete updateData.employeeId;

    const user = await User.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy,
        updatedAt: new Date(),
      },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    ).select('-passwordHash');

    return user;
  },

  // Soft delete - don't actually delete
  deactivateUser: async (id, deactivatedBy) => {
    return User.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy: deactivatedBy,
      },
      { new: true }
    );
  },

  // Use transactions for multi-document operations
  transferUser: async (userId, newDepartment, newManager) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'employment.department': newDepartment,
          'employment.reportingManager': newManager,
        },
        { new: true, session }
      );

      // Update any related documents
      await Attendance.updateMany(
        { employeeId: userId },
        { department: newDepartment },
        { session }
      );

      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },
};

module.exports = userService;
```

---

## Authentication & Authorization

### JWT Authentication

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../config/redis');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    // 3. Check if session exists in Redis
    const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
    const sessionExists = await redisClient.exists(sessionKey);
    if (!sessionExists) {
      throw new UnauthorizedError('Session expired. Please login again.');
    }

    // 4. Get user from database
    const user = await User.findById(decoded.userId)
      .select('-passwordHash')
      .lean();

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    // 5. Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );
      if (decoded.iat < passwordChangedTimestamp) {
        throw new UnauthorizedError('Password was changed. Please login again.');
      }
    }

    // 6. Attach user to request
    req.user = user;
    req.sessionId = decoded.sessionId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
```

### Role-Based Authorization

```javascript
// middleware/authorize.js
const { ForbiddenError } = require('../utils/errors');

/**
 * Authorize middleware - restrict access based on roles
 * @param  {...string} allowedRoles - Roles that can access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }

    const userRole = req.user.employment?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(
        new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Permission-based authorization
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }

    // Admins have all permissions
    if (req.user.employment?.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || {};

    // Check specific permission
    const permissionMap = {
      'approve:leave': userPermissions.canApproveLeave,
      'approve:reimbursement': userPermissions.canApproveReimbursement,
      'manage:schedule': userPermissions.canManageSchedule,
      'view:reports': userPermissions.canViewReports,
    };

    if (!permissionMap[permission]) {
      return next(
        new ForbiddenError(`Permission denied: ${permission}`)
      );
    }

    next();
  };
};

module.exports = { authorize, requirePermission };
```

---

## Validation

### Joi Validation Schemas

```javascript
// validators/userValidator.js
const Joi = require('joi');

// Common schemas
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

const idParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

// Query parameters for listing
const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid('admin', 'hr', 'manager', 'employee'),
  department: Joi.string(),
  isActive: Joi.boolean(),
  search: Joi.string().max(100),
  sortBy: Joi.string().valid('firstName', 'lastName', 'createdAt', 'employeeId'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

// Create user schema
const createUserSchema = Joi.object({
  employeeId: Joi.string()
    .uppercase()
    .trim()
    .required()
    .pattern(/^EMP\d{3,}$/)
    .message('Employee ID must be in format EMP001'),

  username: Joi.string()
    .lowercase()
    .trim()
    .min(3)
    .max(50)
    .required()
    .pattern(/^[a-z0-9._-]+$/)
    .message('Username can only contain lowercase letters, numbers, and .-_'),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain uppercase, lowercase, number, and special character'),

  personalInfo: Joi.object({
    firstName: Joi.string().trim().max(50).required(),
    lastName: Joi.string().trim().max(50).required(),
    email: Joi.string().email().lowercase().trim().required(),
    phone: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/),
    dateOfBirth: Joi.date().max('now').iso(),
    address: Joi.object({
      street: Joi.string().max(200),
      city: Joi.string().max(100),
      state: Joi.string().max(100),
      country: Joi.string().max(100),
      zipCode: Joi.string().max(20),
    }),
    emergencyContact: Joi.object({
      name: Joi.string().max(100),
      relationship: Joi.string().max(50),
      phone: Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/),
    }),
  }).required(),

  employment: Joi.object({
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee').default('employee'),
    department: Joi.string().max(100),
    designation: Joi.string().max(100),
    dateOfJoining: Joi.date().iso(),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract').default('full-time'),
    reportingManagerId: objectIdSchema,
    location: Joi.string().max(100),
    workingHours: Joi.object({
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      weeklyOff: Joi.array().items(
        Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
      ),
    }),
  }),

  allowedIPs: Joi.array().items(
    Joi.string().ip({ version: ['ipv4', 'ipv6'] })
  ),

  leaveBalance: Joi.object({
    casual: Joi.number().integer().min(0).max(100),
    sick: Joi.number().integer().min(0).max(100),
    earned: Joi.number().integer().min(0).max(100),
    compOff: Joi.number().integer().min(0).max(100),
  }),
});

// Update user schema (all fields optional)
const updateUserSchema = createUserSchema.fork(
  Object.keys(createUserSchema.describe().keys),
  (schema) => schema.optional()
);

module.exports = {
  objectIdSchema,
  idParamSchema,
  userQuerySchema,
  createUserSchema,
  updateUserSchema,
};
```

### Validation Middleware

```javascript
// middleware/validate.js
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown keys
      convert: true, // Type coercion
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace request property with validated/sanitized value
    req[property] = value;
    next();
  };
};

module.exports = { validate };
```

---

## Error Handling

### Custom Error Classes

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
};
```

### Global Error Handler

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${field} already exists`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Custom AppError
  if (err.isOperational) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unknown errors (programming errors)
  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message;

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { errorHandler };
```

---

## Logging

### Winston Logger Setup

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'pulse-ops-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // All logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Create log directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

module.exports = logger;
```

### Request Logger Middleware

```javascript
// middleware/requestLogger.js
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
  });

  next();
};

module.exports = { requestLogger };
```

---

## Security

### Security Checklist

| Item | Implementation |
|------|----------------|
| Helmet | Use helmet middleware for HTTP headers |
| Rate Limiting | Limit requests per IP/user |
| Input Sanitization | Sanitize all user inputs |
| SQL/NoSQL Injection | Use parameterized queries (Mongoose) |
| XSS | Escape output, use Content-Type headers |
| CORS | Configure allowed origins |
| Password Hashing | Use bcrypt with salt rounds |
| JWT | Use short expiry, secure storage |
| HTTPS | Force HTTPS in production |
| Secrets | Use environment variables |

### Security Middleware

```javascript
// app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();

// Security Headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
});
app.use('/api', limiter);

// More strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
});
app.use('/api/auth/login', authLimiter);

// NoSQL injection prevention
app.use(mongoSanitize());

// XSS prevention
app.use(xss());

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

module.exports = app;
```

---

## Performance

### Performance Best Practices

```javascript
// 1. Use compression
const compression = require('compression');
app.use(compression());

// 2. Use lean() for read-only queries
const users = await User.find().lean();

// 3. Select only needed fields
const users = await User.find().select('firstName lastName email');

// 4. Use indexes
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1, role: 1 });

// 5. Use Redis caching
const cacheService = {
  get: async (key) => {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  },
  set: async (key, value, ttlSeconds = 300) => {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  },
  del: async (key) => {
    await redisClient.del(key);
  },
};

// Usage
const getUsers = async () => {
  const cacheKey = 'users:all';
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const users = await User.find().lean();
  await cacheService.set(cacheKey, users, 300); // 5 minutes
  return users;
};

// 6. Connection pooling (already in Mongoose by default)
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
});

// 7. Use bulk operations
await User.bulkWrite([
  { updateOne: { filter: { _id: id1 }, update: { $set: { isActive: false } } } },
  { updateOne: { filter: { _id: id2 }, update: { $set: { isActive: false } } } },
]);
```

---

## Git Workflow

### Branch Naming

```
feature/user-management     # New features
bugfix/login-error          # Bug fixes
hotfix/security-patch       # Urgent production fixes
refactor/auth-module        # Code refactoring
```

### Commit Messages

```
feat: Add user management module
fix: Fix login authentication bug
docs: Update API documentation
style: Format code with Prettier
refactor: Extract auth logic to service
test: Add unit tests for userService
chore: Update dependencies
perf: Optimize database queries
security: Fix XSS vulnerability
```

---

## Code Review Checklist

### Before Submitting PR
- [ ] Code follows project structure
- [ ] No hardcoded values (use constants/env)
- [ ] All endpoints have validation
- [ ] Proper error handling
- [ ] No console.logs (use logger)
- [ ] SQL/NoSQL injection prevented
- [ ] Authentication/Authorization in place
- [ ] Sensitive data not logged

### Reviewer Checklist
- [ ] Code is readable
- [ ] Logic is correct
- [ ] Error cases handled
- [ ] Security considerations
- [ ] Performance implications
- [ ] Follows RESTful conventions
- [ ] Response format consistent
- [ ] Validation complete
