const moment = require('moment');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');
const holidayService = require('./holidayService');

/**
 * Get roster for an employee within a date range.
 * Auto-generates schedules if they don't exist, using the last known schedule or user defaults user as baseline.
 *
 * @param {string} userId - The User _id (ObjectId)
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 */
const getEmployeeRoster = async (userId, startDate, endDate) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const start = moment(startDate || new Date()).startOf('day');
    const end = moment(endDate || moment().add(60, 'days')).endOf('day');

    await ensureRosterGenerated(user, start, end);

    const schedules = await Schedule.find({
        employeeId: user._id,
        date: {
            $gte: start.toDate(),
            $lte: end.toDate(),
        },
    }).sort({ date: 1 });

    // Fetch Holidays
    const holidays = await holidayService.getHolidaysInRange(start.toDate(), end.toDate());

    // Fetch Content Leaves
    const leaves = await Leave.find({
        employeeId: user._id,
        status: 'approved',
        $or: [
            { startDate: { $lte: end.toDate() }, endDate: { $gte: start.toDate() } }
        ]
    });

    // Helper to check if a date is a holiday
    const getHoliday = (dateStr) => {
        if (!user.isHolidayApplicable) return null;
        return holidays.find(h => moment(h.date).format('YYYY-MM-DD') === dateStr);
    };

    // Helper to check if a date is a leave
    const getLeave = (dateStr) => {
        const date = moment(dateStr);
        return leaves.find(l => {
            const startL = moment(l.startDate).startOf('day');
            const endL = moment(l.endDate).endOf('day');
            return date.isBetween(startL, endL, 'day', '[]');
        });
    };

    // Restructure output and format shifts
    const shiftData = {};

    // Create a map of schedules for easy lookup
    const scheduleMap = new Map();
    schedules.forEach(s => scheduleMap.set(moment(s.date).format('YYYY-MM-DD'), s));

    // Iterate through each day in the range to ensure coverage
    const dayIterator = moment(start);
    while (dayIterator.isSameOrBefore(end)) {
        const dateKey = dayIterator.format('YYYY-MM-DD');
        const schedule = scheduleMap.get(dateKey);
        const holiday = getHoliday(dateKey);
        const leave = getLeave(dateKey);

        let data = {
            date: dateKey,
            shiftType: 'off', // Default
            shifts: []
        };

        if (schedule) {
            data = formatScheduleResponse(schedule);
        }

        // Priority Logic: Leave > Holiday > Schedule
        if (leave) {
            data.shiftType = 'Leave';
            data.leaveType = leave.leaveType;
            data.leaveReason = leave.reason;
            data.leaveId = leave._id;
            // If it's a half-day leave, we might want to keep the schedule but mark it?
            // For now assuming full day leave overrides everything as per requirement "Leave will go for that day"
            if (leave.halfDay) {
                data.isHalfDayLeave = true;
                data.halfDayType = leave.halfDayType;
                // Keep the shift but maybe mark it? 
                // The requirement says "Leave will go for that day". 
                // Usually for half day, they still have a shift.
                // Keeping shift details if present.
            } else {
                // Full day leave
                data.shifts = []; // Clear shifts
                data.startTime = [];
                data.endTime = [];
            }
        } else if (holiday) {
            data.shiftType = 'Holiday';
            data.holidayName = holiday.name;
            // Clear shifts for holiday
            data.shifts = [];
            data.startTime = [];
            data.endTime = [];
        }

        shiftData[dateKey] = data;
        dayIterator.add(1, 'day');
    }

    return {
        _id: user._id,
        employeeId: user.employeeId,
        Info: {
            firstName: user.personalInfo?.firstName,
            lastName: user.personalInfo?.lastName,
            email: user.personalInfo?.email,
            department: user.employment?.department,
            designation: user.employment?.designation,
        },
        shiftData,
    };
};

/**
 * Helper to format schedule response with "shifts" object array.
 */
const formatScheduleResponse = (schedule) => {
    const s = schedule.toObject ? schedule.toObject() : schedule;
    const shifts = [];

    if (s.startTime && s.endTime && Array.isArray(s.startTime)) {
        const len = Math.min(s.startTime.length, s.endTime.length);
        for (let i = 0; i < len; i++) {
            shifts.push({
                startTime: s.startTime[i],
                endTime: s.endTime[i]
            });
        }
    }

    return {
        ...s,
        shifts
    };
};

/**
 * Update a specific schedule entry.
 *
 * @param {string} scheduleId
 * @param {Object} updateData
 */
const updateSchedule = async (scheduleId, updateData) => {
    // Sanitize input: Remove protected or internal fields to prevent CastErrors
    const { _id, employeeId, date, scheduleId: bodyScheduleId, ...sanitizedData } = updateData;

    // Robustness: Flatten startTime/endTime in case they are nested [["10:00"]]
    if (Array.isArray(sanitizedData.startTime)) {
        sanitizedData.startTime = sanitizedData.startTime.flat();
    }
    if (Array.isArray(sanitizedData.endTime)) {
        sanitizedData.endTime = sanitizedData.endTime.flat();
    }

    const schedule = await Schedule.findByIdAndUpdate(
        scheduleId,
        { $set: sanitizedData },
        { new: true, runValidators: true }
    );

    if (!schedule) {
        throw new Error('Schedule not found');
    }

    return formatScheduleResponse(schedule);
};

/**
 * Ensures schedules exist for every day in the given range.
 * Fills gaps using the "last working schedule" as a baseline or user defaults.
 */
const ensureRosterGenerated = async (user, startMoment, endMoment) => {
    const bulkOps = [];
    const current = moment(startMoment);
    const end = moment(endMoment);

    // 1. Get existing schedules in range to avoid duplicates
    const existingSchedulesInRange = await Schedule.find({
        employeeId: user._id,
        date: {
            $gte: startMoment.toDate(),
            $lte: endMoment.toDate(),
        },
    });

    const existingMap = new Map();
    existingSchedulesInRange.forEach((doc) => {
        existingMap.set(moment(doc.date).format('YYYY-MM-DD'), doc);
    });

    // 2. Fetch baseline patterns (most recent schedule for each day of the week)
    // Looking back at the last 35 days to ensure we cover all days of the week patterns
    const recentSchedules = await Schedule.find({
        employeeId: user._id,
        date: { $lt: startMoment.toDate(), $gte: moment(startMoment).subtract(35, 'days').toDate() }
    }).sort({ date: -1 });

    const baselineMap = new Map(); // dayIndex (0-6) -> lastInstanceDoc
    recentSchedules.forEach(doc => {
        const day = moment(doc.date).day();
        if (!baselineMap.has(day)) {
            baselineMap.set(day, doc);
        }
    });

    const weeklyOffs = user.employment?.workingHours?.weeklyOff || [];

    while (current.isSameOrBefore(end)) {
        const dateKey = current.format('YYYY-MM-DD');

        if (!existingMap.has(dateKey)) {
            const dayName = current.format('dddd');
            const dayIndex = current.day();
            const isOff = weeklyOffs.includes(dayName);
            const lastInstance = baselineMap.get(dayIndex);

            if (isOff) {
                // Always follow profile weeklyOff
                bulkOps.push({
                    insertOne: {
                        document: {
                            employeeId: user._id,
                            date: dateKey,
                            shiftType: 'off',
                            isRecurring: false,
                        },
                    },
                });
            } else if (lastInstance && lastInstance.shiftType !== 'off') {
                // Copy working pattern from last instance
                bulkOps.push({
                    insertOne: {
                        document: {
                            employeeId: user._id,
                            date: dateKey,
                            shiftType: lastInstance.shiftType,
                            startTime: lastInstance.startTime,
                            endTime: lastInstance.endTime,
                            location: lastInstance.location,
                            department: lastInstance.department,
                            isRecurring: false,
                        },
                    },
                });
            } else {
                // Fallback to user defaults for working days
                const workingHours = user.employment?.workingHours || {};
                bulkOps.push({
                    insertOne: {
                        document: {
                            employeeId: user._id,
                            date: dateKey,
                            shiftType: 'day',
                            // Wrap legacy single strings from User model into arrays
                            startTime: [workingHours.startTime || '09:00'],
                            endTime: [workingHours.endTime || '18:00'],
                            location: user.employment?.location || 'Office',
                            department: user.employment?.department || 'General',
                            isRecurring: false,
                        },
                    },
                });
            }
        }
        current.add(1, 'days');
    }

    if (bulkOps.length > 0) {
        await Schedule.bulkWrite(bulkOps);
    }
};

/**
 * Generate rosters for all active users for the next 60 days.
 * Intended to be called by a cron job.
 */
const generateRostersForAllUsers = async () => {
    // console.log('Starting daily roster generation...');
    const users = await User.findActive();
    // console.log(`Found ${users.length} active users.`);

    const today = moment().startOf('day');
    const endDate = moment().add(60, 'days').endOf('day');

    for (const user of users) {
        try {
            await ensureRosterGenerated(user, today, endDate);
        } catch (error) {
            console.error(`Error generating roster for user ${user.employeeId}:`, error);
        }
    }
    // console.log('Daily roster generation completed.');
};

/**
 * Get rosters for all active employees with pagination and filtering.
 */
const getAllEmployeesRosters = async ({ startDate, endDate, page = 1, limit = 10, filters = {} }) => {
    const start = moment(startDate || new Date()).startOf('day');
    const end = moment(endDate || moment().add(60, 'days')).endOf('day');

    const query = { isActive: true };
    if (filters.role) query['employment.role'] = filters.role;
    if (filters.department) query['employment.department'] = filters.department;
    if (filters.search) {
        query.$or = [
            { 'personalInfo.firstName': new RegExp(filters.search, 'i') },
            { 'personalInfo.lastName': new RegExp(filters.search, 'i') },
            { 'personalInfo.email': new RegExp(filters.search, 'i') },
            { employeeId: new RegExp(filters.search, 'i') },
            {
                $expr: {
                    $regexMatch: {
                        input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                        regex: filters.search,
                        options: 'i',
                    },
                },
            },
        ];
    }
    if (filters.employeeIds && filters.employeeIds.length > 0) {
        // Check if the provided IDs are valid ObjectIds. If so, query by _id.
        // Otherwise, query by the custom employeeId field.
        const areObjectIds = filters.employeeIds.every(id => /^[0-9a-fA-F]{24}$/.test(id));

        if (areObjectIds) {
            query._id = { $in: filters.employeeIds };
        } else {
            query.employeeId = { $in: filters.employeeIds };
        }
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const data = [];
    // Fetch Global Holidays for the range
    const holidays = await holidayService.getHolidaysInRange(start.toDate(), end.toDate());

    // Fetch Leaves for all users in this page
    const userIds = users.map(u => u._id);
    const leaves = await Leave.find({
        employeeId: { $in: userIds },
        status: 'approved',
        $or: [
            { startDate: { $lte: end.toDate() }, endDate: { $gte: start.toDate() } }
        ]
    });

    // The duplicate declaration of 'data' is removed here.
    for (const user of users) {
        // Ensure roster is generated for this user in the requested range
        await ensureRosterGenerated(user, start, end);

        // Fetch schedules
        const schedules = await Schedule.find({
            employeeId: user._id,
            date: { $gte: start.toDate(), $lte: end.toDate() },
        }).sort({ date: 1 });

        const scheduleMap = new Map();
        schedules.forEach(s => scheduleMap.set(moment(s.date).format('YYYY-MM-DD'), s));

        const userLeaves = leaves.filter(l => l.employeeId.toString() === user._id.toString());

        const shiftData = {};
        const dayIterator = moment(start);
        while (dayIterator.isSameOrBefore(end)) {
            const dateKey = dayIterator.format('YYYY-MM-DD');
            const schedule = scheduleMap.get(dateKey);

            // Holidays
            let holiday = null;
            if (user.isHolidayApplicable) {
                holiday = holidays.find(h => moment(h.date).format('YYYY-MM-DD') === dateKey);
            }

            // Leaves
            const leave = userLeaves.find(l => {
                const startL = moment(l.startDate).startOf('day');
                const endL = moment(l.endDate).endOf('day');
                return moment(dateKey).isBetween(startL, endL, 'day', '[]');
            });

            let dayData = {
                date: dateKey,
                shiftType: 'off',
                shifts: []
            };

            if (schedule) {
                dayData = formatScheduleResponse(schedule);
            }

            if (leave) {
                dayData.shiftType = 'Leave';
                dayData.leaveType = leave.leaveType;
                dayData.leaveReason = leave.reason;
                dayData.leaveId = leave._id;

                if (leave.halfDay) {
                    dayData.isHalfDayLeave = true;
                    dayData.halfDayType = leave.halfDayType;
                } else {
                    dayData.shifts = [];
                    dayData.startTime = [];
                    dayData.endTime = [];
                }
            } else if (holiday) {
                dayData.shiftType = 'Holiday';
                dayData.holidayName = holiday.name;
                dayData.shifts = [];
                dayData.startTime = [];
                dayData.endTime = [];
            }

            shiftData[dateKey] = dayData;
            dayIterator.add(1, 'day');
        }

        data.push({
            _id: user._id,
            employeeId: user.employeeId,
            Info: {
                firstName: user.personalInfo?.firstName,
                lastName: user.personalInfo?.lastName,
                email: user.personalInfo?.email,
                department: user.employment?.department,
                designation: user.employment?.designation,
            },
            shiftData,
        });
    }

    return { data, total };
};

/**
 * Bulk update multiple schedules.
 *
 * @param {Array} updates - Array of update objects, each containing scheduleId and fields to update.
 */
const bulkUpdateSchedules = async (updates) => {
    const results = [];
    const errors = [];

    for (const update of updates) {
        const { scheduleId, ...data } = update;
        try {
            const result = await updateSchedule(scheduleId, data);
            results.push({ scheduleId, status: 'success', data: result });
        } catch (error) {
            errors.push({ scheduleId, status: 'error', error: error.message });
        }
    }

    return { results, errors };
};

/**
 * Get users grouped by date who have a schedule in the given date range.
 */
const getScheduledUsersByDate = async ({ startDate, endDate, page = 1, limit = 10, dailyUserLimit, department }) => {
    const start = moment(startDate).startOf('day').toDate();
    const end = moment(endDate).endOf('day').toDate();

    // 1. Find distinct employeeIds with schedules in range (excluding 'off' shifts)
    const distinctEmployeeIds = await Schedule.distinct('employeeId', {
        date: { $gte: start, $lte: end },
        shiftType: { $ne: 'off' }
    });

    // 2. Paginate Users first
    const query = {
        _id: { $in: distinctEmployeeIds },
        isActive: true
    };

    if (department) {
        query['employment.department'] = department;
    }

    const matchingUserIds = await User.find(query).distinct('_id');
    const total = matchingUserIds.length;

    // Get the subset of Users for this page (from the already filtered matchingUserIds)
    const users = await User.find({ _id: { $in: matchingUserIds } })
        .select('_id personalInfo.firstName personalInfo.lastName personalInfo.email')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const userIdsOnPage = users.map(u => u._id);
    const userMap = new Map();
    users.forEach(u => {
        userMap.set(u._id.toString(), {
            firstName: u.personalInfo?.firstName,
            lastName: u.personalInfo?.lastName,
            _id: u._id,
            email: u.personalInfo?.email
        });
    });

    // 3. Fetch Schedules for these users in range
    const schedules = await Schedule.find({
        employeeId: { $in: userIdsOnPage },
        date: { $gte: start, $lte: end },
        shiftType: { $ne: 'off' }
    }).sort({ date: 1 });

    // 3.5 Aggregate total counts per date (independent of pagination/limit)
    const counts = await Schedule.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end },
                shiftType: { $ne: 'off' },
                employeeId: { $in: matchingUserIds }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                uniqueUsers: { $addToSet: "$employeeId" }
            }
        },
        {
            $project: {
                date: "$_id",
                total: { $size: "$uniqueUsers" }
            }
        }
    ]);

    const countMap = {};
    counts.forEach(c => {
        countMap[c.date] = c.total;
    });

    // 4. Group by Date
    const shiftData = {};

    schedules.forEach(schedule => {
        const dateKey = moment(schedule.date).format('YYYY-MM-DD');
        if (!shiftData[dateKey]) {
            shiftData[dateKey] = {
                users: [],
                total: countMap[dateKey] || 0,
                hasMore: false
            };
        }

        // Apply daily user limit
        if (dailyUserLimit && shiftData[dateKey].users.length >= dailyUserLimit) {
            shiftData[dateKey].hasMore = true;
            return;
        }

        const userInfo = userMap.get(schedule.employeeId.toString());
        if (userInfo) {
            const existingUsers = shiftData[dateKey].users;
            const alreadyExists = existingUsers.some(u => u._id.toString() === userInfo._id.toString());
            if (!alreadyExists) {
                existingUsers.push(userInfo);
            }
        }
    });

    // Final pass to set hasMore correctly
    Object.keys(shiftData).forEach(dateKey => {
        const entry = shiftData[dateKey];
        if (entry.users.length < entry.total) {
            entry.hasMore = true;
        }
    });

    // 5. Structure response
    const data = [{
        shiftData
    }];

    return { data, total };
};


module.exports = {
    getEmployeeRoster,
    updateSchedule,
    generateRostersForAllUsers,
    getAllEmployeesRosters,
    bulkUpdateSchedules,
    getScheduledUsersByDate,
};
