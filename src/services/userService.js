const User = require('../models/User');
const { NotFoundError, ConflictError } = require('../utils/errors');
// const { hashPassword } = require('../utils/passwordUtils');
const logger = require('../utils/logger');

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

    const user = await User.create(userData);

    logger.info(`User created: ${user.employeeId}`);

    return user;
  },

  updateUser: async (id, updateData) => {
    const updatePayload = {};

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
      'allowedIPs',
      'leaveBalance',
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
    ).select('-passwordHash');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`User updated: ${user.employeeId}`);

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
};

module.exports = userService;
