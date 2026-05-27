const salaryConfigService = require('../services/salaryConfigService');

const salaryConfigController = {
  getConfigs: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        employeeId: req.query.employeeId,
      };

      const result = await salaryConfigService.getConfigs({ page, limit, filters });

      res.status(200).json({
        success: true,
        data: result.configs,
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

  getConfigById: async (req, res, next) => {
    try {
      const config = await salaryConfigService.getConfigById(req.params.id);
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  getLatestConfigByEmployee: async (req, res, next) => {
    try {
      const config = await salaryConfigService.getLatestConfigByEmployee(req.params.employeeId);
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  createConfig: async (req, res, next) => {
    try {
      const config = await salaryConfigService.createConfig(req.body);
      res.status(201).json({
        success: true,
        message: 'Salary configuration created successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  updateConfig: async (req, res, next) => {
    try {
      const config = await salaryConfigService.updateConfig(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Salary configuration updated successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteConfig: async (req, res, next) => {
    try {
      await salaryConfigService.deleteConfig(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Salary configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = salaryConfigController;
