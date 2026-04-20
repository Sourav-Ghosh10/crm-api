const allowanceDeductionService = require('../services/allowanceDeductionService');

const allowanceDeductionController = {
  getMasters: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        type: req.query.type,
        search: req.query.search,
      };

      const result = await allowanceDeductionService.getMasters({ page, limit, filters });

      res.status(200).json({
        success: true,
        data: result.masters,
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

  getMasterById: async (req, res, next) => {
    try {
      const master = await allowanceDeductionService.getMasterById(req.params.id);
      res.status(200).json({
        success: true,
        data: master,
      });
    } catch (error) {
      next(error);
    }
  },

  createMaster: async (req, res, next) => {
    try {
      const master = await allowanceDeductionService.createMaster(req.body);
      res.status(201).json({
        success: true,
        message: 'Allowance/Deduction master created successfully',
        data: master,
      });
    } catch (error) {
      next(error);
    }
  },

  updateMaster: async (req, res, next) => {
    try {
      const master = await allowanceDeductionService.updateMaster(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Allowance/Deduction master updated successfully',
        data: master,
      });
    } catch (error) {
      next(error);
    }
  },

  toggleStatus: async (req, res, next) => {
    try {
      const { isActive } = req.body;
      const master = await allowanceDeductionService.toggleStatus(req.params.id, isActive);
      res.status(200).json({
        success: true,
        message: `Master ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: master,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteMaster: async (req, res, next) => {
    try {
      await allowanceDeductionService.deleteMaster(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Allowance/Deduction master deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = allowanceDeductionController;
