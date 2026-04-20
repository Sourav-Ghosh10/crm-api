const payslipService = require('../services/payslipService');

const payslipController = {
  getPayslips: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {
        employeeId: req.query.employeeId,
        month: req.query.month ? parseInt(req.query.month, 10) : undefined,
        year: req.query.year ? parseInt(req.query.year, 10) : undefined,
        status: req.query.status,
      };

      const result = await payslipService.getPayslips({ page, limit, filters });

      res.status(200).json({
        success: true,
        data: result.payslips,
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

  getPayslipById: async (req, res, next) => {
    try {
      const payslip = await payslipService.getPayslipById(req.params.id);
      res.status(200).json({
        success: true,
        data: payslip,
      });
    } catch (error) {
      next(error);
    }
  },

  generatePayslip: async (req, res, next) => {
    try {
      const payslip = await payslipService.generatePayslip({
        ...req.body,
        requestedBy: req.user._id // Assuming auth middleware adds user to req
      });
      res.status(201).json({
        success: true,
        message: 'Payslip generated successfully',
        data: payslip,
      });
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const payslip = await payslipService.updatePayslipStatus(
        req.params.id, 
        status, 
        req.user._id
      );
      res.status(200).json({
        success: true,
        message: `Payslip status updated to ${status}`,
        data: payslip,
      });
    } catch (error) {
      next(error);
    }
  },

  deletePayslip: async (req, res, next) => {
    try {
      await payslipService.deletePayslip(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Payslip deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = payslipController;
