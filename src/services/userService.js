const User = require('../models/User');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
// const { hashPassword } = require('../utils/passwordUtils');
const logger = require('../utils/logger');

const shiftTime = (timeStr, offsetMinutes) => {
  if (!timeStr || typeof timeStr !== 'string') return timeStr;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  let totalMinutes = hours * 60 + minutes + offsetMinutes;

  // Wrap around 24 hours (1440 minutes)
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const newMinutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${newHours}:${newMinutes}`;
};

const userService = {
  getUsers: async ({ page, limit, filters }) => {
    // console.log('🔍 Received filters:', filters);
    const query = { isActive: true };

    if (filters.role) query['employment.role'] = filters.role;
    if (filters.department) query['employment.department'] = filters.department;
    if (filters.employmentType) query['employment.employmentType'] = filters.employmentType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { 'personalInfo.firstName': new RegExp(filters.search, 'i') },
        { 'personalInfo.lastName': new RegExp(filters.search, 'i') },
        { 'personalInfo.email': new RegExp(filters.search, 'i') },
        { employeeId: new RegExp(filters.search, 'i') },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
              regex: filters.search,
              options: 'i',
            },
          },
        },
      ];
    }

    // console.log('🔍 Final MongoDB query:', JSON.stringify(query, null, 2));

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('employment.roleId')
        .populate('employment.reportingManager', 'personalInfo.firstName personalInfo.lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return { users, total };
  },

  getUserById: async (id) => {
    const user = await User.findById(id)
      .select('-passwordHash')
      .populate('employment.roleId')
      .populate('employment.reportingManager', 'personalInfo.firstName personalInfo.lastName')
      .lean();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  },

  createUser: async (userData) => {
    // console.log(userData);

    const existing = await User.findOne({
      $or: [
        { employeeId: userData.employeeId },
        { username: userData.username },
        { 'personalInfo.email': userData.personalInfo.email },
      ],
    });

    if (existing) {
      throw new ConflictError(
        'User with this email, username, or employee ID already exists'
      );
    }

    // Validate reporting manager
    if (userData.employment?.reportingManager) {
      const managerExists = await User.exists({
        _id: userData.employment.reportingManager,
      });
      if (!managerExists) {
        throw new Error('Reporting manager does not exist');
      }
    }

    userData.passwordHash = userData.password;
    delete userData.password;

    // Resolve role name if roleId is provided
    if (userData.employment?.roleId) {
      const Role = require('../models/Role');
      const roleDoc = await Role.findById(userData.employment.roleId);
      if (roleDoc) {
        userData.employment.role = roleDoc.name;
      }
    }

    const user = await User.create(userData);

    logger.info(`User created: ${user.employeeId}`);

    return user;
  },

  updateUser: async (id, updateData) => {
    const updatePayload = {};

    // Resolve role name if roleId is provided
    if (updateData.employment?.roleId) {
      const Role = require('../models/Role');
      const roleDoc = await Role.findById(updateData.employment.roleId);
      if (roleDoc) {
        updateData.employment.role = roleDoc.name;
      }
    }

    // 🔹 Handle employment safely
    if (updateData.employment) {
      for (const [key, value] of Object.entries(updateData.employment)) {
        updatePayload[`employment.${key}`] = value;
      }
    }

    // 🔹 Handle personalInfo safely
    if (updateData.personalInfo) {
      for (const [key, value] of Object.entries(updateData.personalInfo)) {
        updatePayload[`personalInfo.${key}`] = value;
      }
    }

    // 🔹 Handle permissions safely
    if (updateData.permissions) {
      for (const [key, value] of Object.entries(updateData.permissions)) {
        updatePayload[`permissions.${key}`] = value;
      }
    }

    // 🔹 Handle other root-level fields
    const rootFields = [
      'isAdmin',
      'isActive',
      'isHolidayApplicable',
      'isPaidLeaveApplicable',
      'allowedIPs',
      'leaveBalance',
      'totalLeaveBalance',
      'lastLogin',
    ];

    rootFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updatePayload[field] = updateData[field];
      }
    });

    updatePayload.updatedAt = new Date();

    console.log('FINAL UPDATE PAYLOAD:', updatePayload);

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updatePayload }, // ✅ KEY FIX
      {
        new: true,
        runValidators: true,
      }
    ).select('-passwordHash')
    .populate('employment.roleId');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`User updated: ${user.employeeId}`);

    // Auto-sync future schedules if working hours or weekly off were updated
    if (updateData.employment?.workingHours) {
      try {
        const scheduleService = require('./scheduleService');
        await scheduleService.syncFutureSchedulesWithWorkingHours(id);
        logger.info(`Automatically synced future schedules for user ${user.employeeId} with updated working hours`);
      } catch (syncError) {
        logger.error(`Error auto-syncing schedules for user ${user.employeeId}: ${syncError.message}`);
      }
    }

    return user;
  },

  changePassword: async (id, newPassword) => {
    const user = await User.findById(id).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.passwordHash = newPassword;
    await user.save({ validateBeforeSave: false });
    logger.info(`Password changed for user: ${user.employeeId}`);
    return user;
  },

  deactivateUser: async (data) => {
    console.log(data);
    const user = await User.findByIdAndUpdate(
      data.id,
      {
        isActive: data.isActive,
      },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`User ${data.isActive ? 'activated' : 'deactivated'}: ${user.employeeId}`);

    return user;
  },

  getTimezonesSummary: async () => {
    const summary = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { $ifNull: ['$employment.timezone', 'Asia/Kolkata'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    return summary.map((item) => ({
      timezone: item._id,
      count: item.count,
    }));
  },

  adjustTimezoneHours: async ({ timezone, direction, hours = 0, minutes = 0, syncFutureSchedules = true }) => {
    const sign = direction === 'subtract' ? -1 : 1;
    const totalOffsetMinutes = sign * (parseInt(hours, 10) * 60 + parseInt(minutes, 10));

    if (totalOffsetMinutes === 0) {
      throw new BadRequestError('Adjustment cannot be 0 minutes.');
    }

    const filter = {
      isActive: true,
      $or: [
        { 'employment.timezone': timezone },
        ...(timezone === 'Asia/Kolkata'
          ? [
              { 'employment.timezone': { $exists: false } },
              { 'employment.timezone': null },
              { 'employment.timezone': '' },
            ]
          : []),
      ],
    };

    const users = await User.find(filter);

    if (users.length === 0) {
      return {
        timezone,
        offsetMinutes: totalOffsetMinutes,
        direction,
        hours: parseInt(hours, 10),
        minutes: parseInt(minutes, 10),
        updatedUsersCount: 0,
        users: [],
        message: `No active employees found with timezone "${timezone}".`,
      };
    }

    const scheduleService = require('./scheduleService');
    const updatedUsers = [];

    for (const user of users) {
      const currentStart = user.employment?.workingHours?.startTime || '09:00';
      const currentEnd = user.employment?.workingHours?.endTime || '18:00';

      const newStart = shiftTime(currentStart, totalOffsetMinutes);
      const newEnd = shiftTime(currentEnd, totalOffsetMinutes);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'employment.workingHours.startTime': newStart,
            'employment.workingHours.endTime': newEnd,
          },
        }
      );

      if (syncFutureSchedules) {
        try {
          await scheduleService.syncFutureSchedulesWithWorkingHours(user._id);
        } catch (err) {
          logger.error(`Failed to sync future schedules for user ${user.employeeId}: ${err.message}`);
        }
      }

      updatedUsers.push({
        _id: user._id,
        employeeId: user.employeeId,
        name: `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim(),
        oldWorkingHours: { startTime: currentStart, endTime: currentEnd },
        newWorkingHours: { startTime: newStart, endTime: newEnd },
      });
    }

    logger.info(`Adjusted working hours by ${totalOffsetMinutes} minutes for ${users.length} users in timezone ${timezone}`);

    return {
      timezone,
      offsetMinutes: totalOffsetMinutes,
      direction,
      hours: parseInt(hours, 10),
      minutes: parseInt(minutes, 10),
      updatedUsersCount: users.length,
      users: updatedUsers,
    };
  },
};

module.exports = userService;
