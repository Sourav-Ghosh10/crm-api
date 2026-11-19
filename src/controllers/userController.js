const userService = require('../services/userService');
const { BadRequestError } = require('../utils/errors');

const userController = {
  getUsers: async (req, res, next) => {
    try {
      // console.log('📥 Query params:', req.query);
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        role: req.query.role,
        roleId: req.query.roleId,
        department: req.query.department,
        location: req.query.location,
        isActive: req.query.isActive,
        employmentType: req.query.employmentType,
        search: req.query.search,
      };
      // console.log('📤 Filters being sent to service:', filters);

      const result = await userService.getUsers({ page, limit, filters, currentUser: req.user });

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.params.id, req.user);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  createUser: async (req, res, next) => {
    try {
      const user = await userService.createUser(req.body);

      // Sensitive data removal handled by User model toJSON transform
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.query;

      await userService.deactivateUser({ id, isActive: isActive === 'true' || isActive === true });

      res.status(200).json({
        success: true,
        message: (isActive === 'true' || isActive === true) ? 'User activated successfully' : 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      await userService.changePassword(id, password);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  getTimezonesSummary: async (req, res, next) => {
    try {
      const result = await userService.getTimezonesSummary(req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  adjustTimezoneHours: async (req, res, next) => {
    try {
      const result = await userService.adjustTimezoneHours({ ...req.body, currentUser: req.user });
      const signText = result.direction === 'add' ? '+' : '-';
      const timeText = `${signText}${result.hours}h${result.minutes > 0 ? ` ${result.minutes}m` : ''}`;
      res.status(200).json({
        success: true,
        message: `Successfully shifted working hours by ${timeText} for ${result.updatedUsersCount} employee(s) in timezone ${result.timezone}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
