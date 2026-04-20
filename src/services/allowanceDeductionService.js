const AllowanceDeductionMaster = require('../models/AllowanceDeductionMaster');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const allowanceDeductionService = {
  getMasters: async ({ page, limit, filters }) => {
    const query = {};
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { code: new RegExp(filters.search, 'i') }
      ];
    }

    const [masters, total] = await Promise.all([
      AllowanceDeductionMaster.find(query)
        .sort({ displayOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AllowanceDeductionMaster.countDocuments(query),
    ]);

    return { masters, total };
  },

  getMasterById: async (id) => {
    const master = await AllowanceDeductionMaster.findById(id).lean();
    if (!master) {
      throw new NotFoundError('Allowance/Deduction master not found');
    }
    return master;
  },

  createMaster: async (data) => {
    const existing = await AllowanceDeductionMaster.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError('Master with this code already exists');
    }

    const master = await AllowanceDeductionMaster.create(data);
    logger.info(`Allowance/Deduction master created: ${master.name} (${master.code})`);
    return master;
  },

  updateMaster: async (id, data) => {
    const master = await AllowanceDeductionMaster.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!master) {
      throw new NotFoundError('Allowance/Deduction master not found');
    }

    logger.info(`Allowance/Deduction master updated: ${master.name}`);
    return master;
  },

  toggleStatus: async (id, isActive) => {
    const master = await AllowanceDeductionMaster.findByIdAndUpdate(
      id,
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    if (!master) {
      throw new NotFoundError('Allowance/Deduction master not found');
    }

    logger.info(`Allowance/Deduction master status toggled: ${master.name} to ${isActive}`);
    return master;
  },

  deleteMaster: async (id) => {
    const master = await AllowanceDeductionMaster.findByIdAndDelete(id);
    if (!master) {
      throw new NotFoundError('Allowance/Deduction master not found');
    }
    logger.info(`Allowance/Deduction master deleted: ${master.name}`);
    return master;
  }
};

module.exports = allowanceDeductionService;
