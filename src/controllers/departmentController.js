const departmentService = require('../services/departmentService');

const departmentController = {
    getDepartments: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
            };

            const result = await departmentService.getDepartments({ page, limit, filters });

            res.status(200).json({
                success: true,
                data: result.departments,
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

    getDepartmentById: async (req, res, next) => {
        try {
            const department = await departmentService.getDepartmentById(req.params.id);
            res.status(200).json({
                success: true,
                data: department,
            });
        } catch (error) {
            next(error);
        }
    },

    createDepartment: async (req, res, next) => {
        try {
            const department = await departmentService.createDepartment(req.body);
            res.status(201).json({
                success: true,
                message: 'Department created successfully',
                data: department,
            });
        } catch (error) {
            next(error);
        }
    },

    updateDepartment: async (req, res, next) => {
        try {
            const department = await departmentService.updateDepartment(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Department updated successfully',
                data: department,
            });
        } catch (error) {
            next(error);
        }
    },

    toggleStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const department = await departmentService.toggleStatus(req.params.id, isActive);
            res.status(200).json({
                success: true,
                message: `Department ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: department,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteDepartment: async (req, res, next) => {
        try {
            await departmentService.deleteDepartment(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Department deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = departmentController;
