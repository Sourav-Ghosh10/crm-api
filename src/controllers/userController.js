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
        department: req.query.department,
        isActive: req.query.isActive,
        employmentType: req.query.employmentType,
        search: req.query.search,
      };
      // console.log('📤 Filters being sent to service:', filters);

      const result = await userService.getUsers({ page, limit, filters });

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
      const user = await userService.getUserById(req.params.id);

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
      const user = await userService.updateUser(req.params.id, req.body);

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
};

module.exports = userController;
