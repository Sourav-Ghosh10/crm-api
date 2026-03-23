const designationService = require('../services/designationService');

const designationController = {
    getDesignations: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
            };

            const result = await designationService.getDesignations({ page, limit, filters });

            res.status(200).json({
                success: true,
                data: result.designations,
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

    getDesignationById: async (req, res, next) => {
        try {
            const designation = await designationService.getDesignationById(req.params.id);
            res.status(200).json({
                success: true,
                data: designation,
            });
        } catch (error) {
            next(error);
        }
    },

    createDesignation: async (req, res, next) => {
        try {
            const designation = await designationService.createDesignation(req.body);
            res.status(201).json({
                success: true,
                message: 'Designation created successfully',
                data: designation,
            });
        } catch (error) {
            next(error);
        }
    },

    updateDesignation: async (req, res, next) => {
        try {
            const designation = await designationService.updateDesignation(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Designation updated successfully',
                data: designation,
            });
        } catch (error) {
            next(error);
        }
    },

    toggleStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const designation = await designationService.toggleStatus(req.params.id, isActive);
            res.status(200).json({
                success: true,
                message: `Designation ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: designation,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteDesignation: async (req, res, next) => {
        try {
            await designationService.deleteDesignation(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Designation deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = designationController;
