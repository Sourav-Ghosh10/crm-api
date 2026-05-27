const reimbursementService = require('../services/reimbursementService');
const catchAsync = require('../utils/catchAsync');

const reimbursementController = {
    createRequest: catchAsync(async (req, res) => {
        const request = await reimbursementService.createRequest(req.user._id, req.body);
        res.status(201).json({
            success: true,
            message: 'Reimbursement request submitted successfully',
            data: request,
        });
    }),
    updateRequest: catchAsync(async (req, res) => {
        const request = await reimbursementService.updateRequest(req.params.id, req.user._id, req.body);
        res.status(200).json({
            success: true,
            message: 'Reimbursement request updated successfully',
            data: request,
        });
    }),

    getMyRequests: catchAsync(async (req, res) => {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const filters = {
            ...req.query,
            employeeId: req.user._id,
        };

        const result = await reimbursementService.getRequests({ page, limit, filters });

        res.status(200).json({
            success: true,
            data: result.requests,
            pagination: {
                total: result.total,
                page,
                limit,
                pages: Math.ceil(result.total / limit),
            },
        });
    }),

    getAllRequests: catchAsync(async (req, res) => {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const filters = req.query;

        const result = await reimbursementService.getRequests({ page, limit, filters });

        res.status(200).json({
            success: true,
            data: result.requests,
            pagination: {
                total: result.total,
                page,
                limit,
                pages: Math.ceil(result.total / limit),
            },
        });
    }),

    getRequestDetails: catchAsync(async (req, res) => {
        const request = await reimbursementService.getRequestById(req.params.id);
        res.status(200).json({
            success: true,
            data: request,
        });
    }),

    updateStatus: catchAsync(async (req, res) => {
        const request = await reimbursementService.updateStatus(req.params.id, req.user._id, req.body);
        res.status(200).json({
            success: true,
            message: `Reimbursement request ${req.body.status} successfully`,
            data: request,
        });
    }),

    markPaid: catchAsync(async (req, res) => {
        const request = await reimbursementService.markAsPaid(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: 'Reimbursement request marked as paid',
            data: request,
        });
    }),

    deleteRequest: catchAsync(async (req, res) => {
        await reimbursementService.deleteRequest(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Reimbursement request deleted successfully',
        });
    }),
};

module.exports = reimbursementController;
