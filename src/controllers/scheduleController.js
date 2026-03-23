const scheduleService = require('../services/scheduleService');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const scheduleController = {
    getEmployeeRoster: async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query;

            const redisClient = getRedisClient();
            const cacheKey = `roster:${userId}:${startDate || 'default'}:${endDate || 'default'}`;

            // 1. Try to fetch from Redis
            if (redisClient && redisClient.isOpen) {
                try {
                    const cachedData = await redisClient.get(cacheKey);
                    if (cachedData) {
                        // logger.info(`🚀 Cache Hit for ${cacheKey}`);
                        return res.status(200).json({
                            success: true,
                            data: [JSON.parse(cachedData)],
                            fromCache: true
                        });
                    }
                } catch (err) {
                    logger.error('Redis Get Error:', err);
                }
            }

            // 2. Cache Miss - Fetch from Service
            const roster = await scheduleService.getEmployeeRoster(userId, startDate, endDate);

            // 3. Store in Redis
            if (redisClient && redisClient.isOpen) {
                try {
                    await redisClient.setEx(cacheKey, 3600, JSON.stringify(roster));
                    // logger.info(`💾 Cache Miss - Stored ${cacheKey}`);
                } catch (err) {
                    logger.error('Redis Set Error:', err);
                }
            }

            res.status(200).json({
                success: true,
                data: [roster],
            });
        } catch (error) {
            next(error);
        }
    },

    updateSchedule: async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            // console.log(updateData);
            const schedule = await scheduleService.updateSchedule(id, updateData);

            // Invalidate Cache for this user
            const redisClient = getRedisClient();
            if (redisClient && redisClient.isOpen && schedule && schedule.employeeId) {
                const pattern = `roster:${schedule.employeeId}:*`;
                try {
                    const keys = await redisClient.keys(pattern);
                    if (keys.length > 0) {
                        await redisClient.del(keys);
                        // logger.info(`🧹 Cache Invalidated for user ${schedule.employeeId}`);
                    }
                } catch (err) {
                    logger.error('Redis Invalidation Error:', err);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Schedule updated successfully',
                data: schedule,
            });
        } catch (error) {
            next(error);
        }
    },

    generateAllRosters: async (req, res, next) => {
        try {
            await scheduleService.generateRostersForAllUsers();

            res.status(200).json({
                success: true,
                message: 'Roster generation started for all users',
            });
        } catch (error) {
            next(error);
        }
    },

    getAllRosters: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const { startDate, endDate, department, role, search, employeeIds } = req.query;

            // Handle employeeIds: if string, split by comma; if array, keep as is
            let processedEmployeeIds;
            if (typeof employeeIds === 'string') {
                processedEmployeeIds = employeeIds.split(',').map(id => id.trim()).filter(id => id);
            } else if (Array.isArray(employeeIds)) {
                processedEmployeeIds = employeeIds;
            }

            const result = await scheduleService.getAllEmployeesRosters({
                startDate,
                endDate,
                page,
                limit,
                filters: { department, role, search, employeeIds: processedEmployeeIds },
            });

            res.status(200).json({
                success: true,
                data: result.data,
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

    bulkUpdateSchedules: async (req, res, next) => {
        try {
            const updates = req.body;
            const result = await scheduleService.bulkUpdateSchedules(updates);

            // Invalidate Cache for affected users
            const redisClient = getRedisClient();
            if (redisClient && redisClient.isOpen && result.results) {
                const userIdsToInvalidate = new Set();
                result.results.forEach(r => {
                    if (r.status === 'success' && r.data && r.data.employeeId) {
                        userIdsToInvalidate.add(r.data.employeeId.toString());
                    }
                });

                for (const userId of userIdsToInvalidate) {
                    try {
                        const keys = await redisClient.keys(`roster:${userId}:*`);
                        if (keys.length > 0) await redisClient.del(keys);
                    } catch (err) {
                        logger.error(`Redis Bulk Invalidation Error for ${userId}:`, err);
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: 'Bulk update processed',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    getScheduledUsersByDate: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const dailyUserLimit = req.query.dailyUserLimit ? parseInt(req.query.dailyUserLimit, 10) : null;
            const { startDate, endDate, department } = req.query;

            const result = await scheduleService.getScheduledUsersByDate({
                startDate,
                endDate,
                page,
                limit,
                dailyUserLimit,
                department
            });

            res.status(200).json({
                success: true,
                data: result.data,
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
};

module.exports = scheduleController;
