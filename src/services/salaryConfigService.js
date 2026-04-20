const SalaryConfig = require('../models/SalaryConfig');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const salaryConfigService = {
  getConfigs: async ({ page, limit, filters }) => {
    const query = {};
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.employeeId) query.employeeId = filters.employeeId;

    const [configs, total] = await Promise.all([
      SalaryConfig.find(query)
        .populate('employeeId', 'personalInfo employment')
        .populate('items.masterId')
        .sort({ effectiveFrom: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SalaryConfig.countDocuments(query),
    ]);

    return { configs, total };
  },

  getConfigById: async (id) => {
    const config = await SalaryConfig.findById(id)
      .populate('employeeId', 'personalInfo employment')
      .populate('items.masterId')
      .lean();
    if (!config) {
      throw new NotFoundError('Salary configuration not found');
    }
    return config;
  },

  getLatestConfigByEmployee: async (employeeId) => {
    const config = await SalaryConfig.findOne({ employeeId, isActive: true })
      .populate('items.masterId')
      .sort({ effectiveFrom: -1 })
      .lean();
    return config;
  },

  createConfig: async (data) => {
    // If setting a new config as active, deactivate previous active configs for same employee
    if (data.isActive) {
      await SalaryConfig.updateMany(
        { employeeId: data.employeeId, isActive: true },
        { isActive: false }
      );
    }

    const config = await SalaryConfig.create(data);
    logger.info(`Salary configuration created for employee: ${data.employeeId}`);
    return config;
  },

  updateConfig: async (id, data) => {
    const config = await SalaryConfig.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!config) {
      throw new NotFoundError('Salary configuration not found');
    }

    logger.info(`Salary configuration updated: ${id}`);
    return config;
  },

  deleteConfig: async (id) => {
    const config = await SalaryConfig.findByIdAndDelete(id);
    if (!config) {
      throw new NotFoundError('Salary configuration not found');
    }
    logger.info(`Salary configuration deleted: ${id}`);
    return config;
  }
};

module.exports = salaryConfigService;
