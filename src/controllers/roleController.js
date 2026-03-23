const roleService = require('../services/roleService');

const roleController = {
    getRoles: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
            };

            const result = await roleService.getRoles({ page, limit, filters });

            res.status(200).json({
                success: true,
                data: result.roles,
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

    getRoleById: async (req, res, next) => {
        try {
            const role = await roleService.getRoleById(req.params.id);
            res.status(200).json({
                success: true,
                data: role,
            });
        } catch (error) {
            next(error);
        }
    },

    createRole: async (req, res, next) => {
        try {
            const role = await roleService.createRole(req.body);
            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: role,
            });
        } catch (error) {
            next(error);
        }
    },

    updateRole: async (req, res, next) => {
        try {
            const role = await roleService.updateRole(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Role updated successfully',
                data: role,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteRole: async (req, res, next) => {
        try {
            await roleService.deleteRole(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Role deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = roleController;
