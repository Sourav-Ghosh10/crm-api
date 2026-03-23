const activityService = require('../services/activityService');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { USER_ROLES } = require('../config/constants');
const logger = require('../utils/logger');

const activityController = {
    getRecentActivity: async (req, res, next) => {
        try {
            const { date, employeeId } = req.query;

            if (!date) {
                throw new BadRequestError('Date is required (YYYY-MM-DD)');
            }

            let targetUserId = req.user.id;

            // Admin/Manager logic
            if (employeeId) {
                const isAdminOrManager = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.HR].includes(req.user.employment.role);
                if (!isAdminOrManager && employeeId !== req.user.id) {
                    throw new UnauthorizedError('You do not have permission to view other employees activities');
                }
                if (employeeId !== req.user.id) {
                    logger.info(`Admin/Manager ${req.user.id} viewed activity for employee ${employeeId} on ${date}`);
                }
                targetUserId = employeeId;
            }

            const result = await activityService.getRecentActivity(targetUserId, date);

            res.status(200).json({
                success: true,
                message: 'Recent activity fetched successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = activityController;
