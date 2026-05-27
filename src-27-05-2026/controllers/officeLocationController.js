const officeLocationService = require('../services/officeLocationService');

const officeLocationController = {
    /**
     * Get all office locations
     */
    getOfficeLocations: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
            };

            const result = await officeLocationService.getOfficeLocations({ page, limit, filters });

            res.status(200).json({
                success: true,
                data: result.locations,
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

    /**
     * Get office location by ID
     */
    getOfficeLocationById: async (req, res, next) => {
        try {
            const location = await officeLocationService.getOfficeLocationById(req.params.id);
            res.status(200).json({
                success: true,
                data: location,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create office location
     */
    createOfficeLocation: async (req, res, next) => {
        try {
            const location = await officeLocationService.createOfficeLocation(req.body);
            res.status(201).json({
                success: true,
                message: 'Office location created successfully',
                data: location,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update office location
     */
    updateOfficeLocation: async (req, res, next) => {
        try {
            const location = await officeLocationService.updateOfficeLocation(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Office location updated successfully',
                data: location,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Toggle status
     */
    toggleStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const location = await officeLocationService.toggleStatus(req.params.id, isActive);
            res.status(200).json({
                success: true,
                message: `Office location ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: location,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete office location
     */
    deleteOfficeLocation: async (req, res, next) => {
        try {
            await officeLocationService.deleteOfficeLocation(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Office location deleted successfully',
            });
        } catch (error) {
            require('fs').appendFileSync('debug_location.log', JSON.stringify({ message: error.message, stack: error.stack }, null, 2) + '\n');
            next(error);
        }
    },
};

module.exports = officeLocationController;
