const holidayService = require('../services/holidayService');

const holidayController = {
    getHolidays: async (req, res, next) => {
        try {
            console.log('🔍 Raw query:', req.query);
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;

            // Joi converts 'true'/'false' strings to booleans, so handle both cases
            let isActiveFilter = undefined;
            if (req.query.isActive !== undefined) {
                if (typeof req.query.isActive === 'boolean') {
                    isActiveFilter = req.query.isActive;
                } else if (req.query.isActive === 'true') {
                    isActiveFilter = true;
                } else if (req.query.isActive === 'false') {
                    isActiveFilter = false;
                }
            }

            const filters = {
                isActive: isActiveFilter,
                search: req.query.search,
                year: req.query.year ? parseInt(req.query.year, 10) : undefined,
                month: req.query.month ? parseInt(req.query.month, 10) : undefined,
            };
            console.log('🔍 Filters being sent:', filters);

            const result = await holidayService.getHolidays({ page, limit, filters });

            res.status(200).json({
                success: true,
                data: result.holidays,
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

    getHolidayById: async (req, res, next) => {
        try {
            const holiday = await holidayService.getHolidayById(req.params.id);
            res.status(200).json({
                success: true,
                data: holiday,
            });
        } catch (error) {
            next(error);
        }
    },

    createHoliday: async (req, res, next) => {
        try {
            const holiday = await holidayService.createHoliday(req.body);
            res.status(201).json({
                success: true,
                message: 'Holiday created successfully',
                data: holiday,
            });
        } catch (error) {
            next(error);
        }
    },

    updateHoliday: async (req, res, next) => {
        try {
            const holiday = await holidayService.updateHoliday(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Holiday updated successfully',
                data: holiday,
            });
        } catch (error) {
            next(error);
        }
    },

    toggleStatus: async (req, res, next) => {
        try {
            const { isActive } = req.body;
            const holiday = await holidayService.toggleStatus(req.params.id, isActive);
            res.status(200).json({
                success: true,
                message: `Holiday ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: holiday,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteHoliday: async (req, res, next) => {
        try {
            await holidayService.deleteHoliday(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Holiday deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = holidayController;
