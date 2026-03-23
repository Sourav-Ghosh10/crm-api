const Holiday = require('../models/Holiday');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const moment = require('moment');

const holidayService = {
    getHolidays: async ({ page, limit, filters }) => {
        console.log('🔍 Service received filters:', filters);
        const query = { isActive: true }; // Default to active

        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        console.log('🔍 Query after isActive:', query);

        if (filters.search) {
            query.name = new RegExp(filters.search, 'i');
        }

        // Filter by year and/or month
        if (filters.year && filters.month) {
            // Both year and month provided - filter for specific month of specific year
            const startOfMonth = new Date(filters.year, filters.month - 1, 1);
            const endOfMonth = new Date(filters.year, filters.month, 0, 23, 59, 59);

            query.$or = [
                { date: { $gte: startOfMonth, $lte: endOfMonth } },
                {
                    isRecurring: true,
                    $expr: { $eq: [{ $month: "$date" }, filters.month] }
                }
            ];
        } else if (filters.year) {
            // Only year provided
            const startOfYear = new Date(filters.year, 0, 1);
            const endOfYear = new Date(filters.year, 11, 31, 23, 59, 59);

            query.$or = [
                { date: { $gte: startOfYear, $lte: endOfYear } },
                { isRecurring: true }
            ];
        } else if (filters.month) {
            // Only month provided (across all years)
            query.$or = [
                {
                    $expr: { $eq: [{ $month: "$date" }, filters.month] }
                }
            ];
        }

        console.log('🔍 Final MongoDB query:', JSON.stringify(query, null, 2));

        const [holidays, total] = await Promise.all([
            Holiday.find(query)
                .sort({ date: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Holiday.countDocuments(query),
        ]);

        return { holidays, total };
    },

    getHolidayById: async (id) => {
        const holiday = await Holiday.findById(id).lean();
        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }
        return holiday;
    },

    createHoliday: async (data) => {
        const holidayDate = new Date(data.date);
        const day = holidayDate.getUTCDate();
        const month = holidayDate.getUTCMonth() + 1; // MongoDB $month is 1-indexed

        // 1. Check for any recurring holiday on the same day/month
        const recurringExists = await Holiday.findOne({
            isRecurring: true,
            $expr: {
                $and: [
                    { $eq: [{ $dayOfMonth: "$date" }, day] },
                    { $eq: [{ $month: "$date" }, month] }
                ]
            }
        });

        if (recurringExists) {
            throw new ConflictError(`A recurring holiday already exists on this day (${recurringExists.name})`);
        }

        // 2. Check for exact date match (regardless of recurring status)
        const exactMatch = await Holiday.findOne({ date: data.date });
        if (exactMatch) {
            throw new ConflictError(`A holiday already exists on this exact date (${exactMatch.name})`);
        }

        // 3. If creating a recurring holiday, ensure no other holiday exists on this day/month in ANY year
        if (data.isRecurring) {
            const anyMatch = await Holiday.findOne({
                $expr: {
                    $and: [
                        { $eq: [{ $dayOfMonth: "$date" }, day] },
                        { $eq: [{ $month: "$date" }, month] }
                    ]
                }
            });
            if (anyMatch) {
                throw new ConflictError(`Cannot make this recurring because a holiday already exists on this day/month in year ${new Date(anyMatch.date).getFullYear()} (${anyMatch.name})`);
            }
        }

        const holiday = await Holiday.create(data);
        logger.info(`Holiday created: ${holiday.name} on ${holiday.date} (Recurring: ${holiday.isRecurring})`);
        return holiday;
    },

    updateHoliday: async (id, data) => {
        const holiday = await Holiday.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }

        logger.info(`Holiday updated: ${holiday.name}`);
        return holiday;
    },

    toggleStatus: async (id, isActive) => {
        const holiday = await Holiday.findByIdAndUpdate(
            id,
            { isActive, updatedAt: new Date() },
            { new: true }
        );

        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }

        logger.info(`Holiday status toggled: ${holiday.name} to ${isActive}`);
        return holiday;
    },

    getHolidaysInRange: async (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // This is complex to do purely in Mongo if the range spans years,
        // but for typical monthly/weekly ranges, we can fetch all recurring
        // and filter in memory, or use a complex $expr.
        // Let's fetch all active recurring + specific range holidays.
        const holidays = await Holiday.find({
            isActive: true,
            $or: [
                { date: { $gte: start, $lte: end } },
                { isRecurring: true }
            ]
        }).lean();

        // If it's recurring, we need to check if it lands in the range
        // by checking Month/Day for each year the range covers.
        const result = [];
        const startMoment = moment(start);
        const endMoment = moment(end);

        holidays.forEach(h => {
            if (!h.isRecurring) {
                result.push(h);
                return;
            }

            // For recurring, check if it falls within the range years
            const hMonth = new Date(h.date).getUTCMonth();
            const hDay = new Date(h.date).getUTCDate();

            for (let year = startMoment.year(); year <= endMoment.year(); year++) {
                const recurrenceDate = moment.utc([year, hMonth, hDay]);
                if (recurrenceDate.isBetween(startMoment, endMoment, 'day', '[]')) {
                    // Clone it and set the date to the current year for the caller
                    result.push({
                        ...h,
                        date: recurrenceDate.toDate(),
                        originalDate: h.date // Keep original just in case
                    });
                }
            }
        });

        return result;
    },

    deleteHoliday: async (id) => {
        const holiday = await Holiday.findByIdAndDelete(id);
        if (!holiday) {
            throw new NotFoundError('Holiday not found');
        }
        logger.info(`Holiday deleted: ${holiday.name}`);
        return holiday;
    }
};

module.exports = holidayService;
