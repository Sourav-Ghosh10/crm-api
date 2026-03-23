const reimbursementTypeService = require('../services/reimbursementTypeService');
const catchAsync = require('../utils/catchAsync');

const reimbursementTypeController = {
    createType: catchAsync(async (req, res) => {
        const type = await reimbursementTypeService.createType(req.body, req.user._id);
        res.status(201).json({
            success: true,
            message: 'Reimbursement type created successfully',
            data: type,
        });
    }),

    getAllTypes: catchAsync(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            isActive: req.query.isActive,
            search: req.query.search,
        };

        const { types, total } = await reimbursementTypeService.getAllTypes({ page, limit, filters });

        res.status(200).json({
            success: true,
            data: types,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }),

    getActiveTypes: catchAsync(async (req, res) => {
        const types = await reimbursementTypeService.getActiveTypes();
        res.status(200).json({
            success: true,
            data: types,
        });
    }),

    updateType: catchAsync(async (req, res) => {
        const type = await reimbursementTypeService.updateType(req.params.id, req.body, req.user._id);
        res.status(200).json({
            success: true,
            message: 'Reimbursement type updated successfully',
            data: type,
        });
    }),

    toggleStatus: catchAsync(async (req, res) => {
        const { isActive } = req.body;
        const type = await reimbursementTypeService.toggleStatus(req.params.id, isActive, req.user._id);
        res.status(200).json({
            success: true,
            message: `Reimbursement type ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: type,
        });
    }),
};

module.exports = reimbursementTypeController;
