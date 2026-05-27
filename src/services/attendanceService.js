const Attendance = require('../models/Attendance');
const Schedule = require('../models/Schedule');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Leave = require('../models/Leave');
const { ATTENDANCE_STATUS } = require('../config/constants');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const moment = require('moment-timezone');
const logger = require('../utils/logger');
const holidayService = require('./holidayService');
const { getRealTime } = require('../utils/realTime');

// Shared Helper: Format duration in MS to "1H 2M 2S"
const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const parts = [];
    if (hours > 0) parts.push(`${hours}H`);
    if (minutes > 0) parts.push(`${minutes}M`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}S`);
    return parts.join(' ');
};

// Shared Helper: Enrich attendance record with real-time durations
const enrichAttendanceRecord = (record, timezone = 'Asia/Kolkata') => {
    const isToday = moment(getRealTime()).tz(timezone).isSame(moment(record.date).tz(timezone), 'day');

    let totalGrossMs = 0;
    let totalBreakMs = 0;
    let totalUnpaidBreakMs = 0;

    // 1. Enrich Breaks first
    if (record.breaks) {
        record.breaks.forEach(b => {
            const start = new Date(b.startTime);
            const end = b.endTime ? new Date(b.endTime) : (isToday ? getRealTime() : start);
            const durationMs = Math.max(0, end - start);
            b.durationMs = durationMs;
            b.durationString = formatDuration(durationMs);
            totalBreakMs += durationMs;

            const isPaidBreak = b.breakType && typeof b.breakType === 'object' ? b.breakType.isPaid === true : false;
            if (!isPaidBreak) {
                totalUnpaidBreakMs += durationMs;
            } else {
                const maxDurationMins = b.breakType && typeof b.breakType === 'object' ? b.breakType.maxDuration : 0;
                if (maxDurationMins > 0) {
                    const maxDurationMs = maxDurationMins * 60000;
                    if (durationMs > maxDurationMs) {
                        totalUnpaidBreakMs += (durationMs - maxDurationMs);
                    }
                }
            }
        });
    }

    // 2. Enrich Sessions
    record.sessions.forEach(session => {
        const checkInTime = new Date(session.checkIn.time);
        const checkOutTime = (session.checkOut && session.checkOut.time) ? new Date(session.checkOut.time) : (isToday ? getRealTime() : null);

        let durationMs = 0;
        if (checkInTime && checkOutTime) {
            durationMs = Math.max(0, checkOutTime - checkInTime);
        } else if (checkInTime) {
            // For open sessions, we use current time to show real-time duration
            durationMs = Math.max(0, getRealTime() - checkInTime);
        }

        // Find breaks that started/occurred during this session
        let sessionBreakMs = 0;
        let sessionUnpaidBreakMs = 0;
        let sessionBreakCount = 0;
        if (record.breaks) {
            record.breaks.forEach(brk => {
                const brkStart = new Date(brk.startTime);
                // If break started within this session
                if (brkStart >= checkInTime && (!checkOutTime || brkStart <= checkOutTime)) {
                    sessionBreakCount++;
                    sessionBreakMs += brk.durationMs || 0;

                    const isPaidBreak = brk.breakType && typeof brk.breakType === 'object' ? brk.breakType.isPaid === true : false;
                    if (!isPaidBreak) {
                        sessionUnpaidBreakMs += brk.durationMs || 0;
                    } else {
                        const maxDurationMins = brk.breakType && typeof brk.breakType === 'object' ? brk.breakType.maxDuration : 0;
                        if (maxDurationMins > 0) {
                            const maxDurationMs = maxDurationMins * 60000;
                            if (brk.durationMs > maxDurationMs) {
                                sessionUnpaidBreakMs += (brk.durationMs - maxDurationMs);
                            }
                        }
                    }
                }
            });
        }

        session.durationMs = durationMs;
        session.durationString = formatDuration(durationMs);

        // Calculate decimal duration based on floored minutes to match H:M display
        const flooredSessionMins = Math.floor(durationMs / 60000);
        session.duration = Number((flooredSessionMins / 60).toFixed(2));

        session.breakMs = sessionBreakMs;
        session.breakDurationString = formatDuration(sessionBreakMs);
        session.breakCount = sessionBreakCount;
        session.netMs = Math.max(0, durationMs - sessionUnpaidBreakMs);
        session.netDurationString = formatDuration(session.netMs);

        totalGrossMs += durationMs;
    });

    const netMs = Math.max(0, totalGrossMs - totalUnpaidBreakMs);

    // Calculate totalHours based on floored net minutes
    const flooredNetMins = Math.floor(netMs / 60000);
    record.totalHours = Number((flooredNetMins / 60).toFixed(2));
    record.totalDurationString = formatDuration(netMs);
    record.totalBreakTime = Number((totalBreakMs / (1000 * 60)).toFixed(2));
    record.totalBreakDurationString = formatDuration(totalBreakMs);

    return record;
};

const attendanceService = {
    clockIn: async (userId, payload) => {
        const now = getRealTime();
        
        // 1. Fetch User first to get timezone
        const user = await User.findById(userId).lean();
        if (!user) throw new NotFoundError('User not found');

        const timezone = user.employment?.timezone || 'Asia/Kolkata';
        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();

        // 2. Check if attendance record for today exists
        let attendance = await Attendance.findOne({
            employeeId: userId,
            date: today,
        });

        if (attendance) {
            // Check if there's an open session
            const lastSession = attendance.sessions[attendance.sessions.length - 1];
            if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
                throw new BadRequestError(`DEBUG_ERR: User ${userId} already has open session in record ${attendance._id} (date ${attendance.date.toISOString()})`);
            }
        }

        // 3. Check Schedule
        const schedule = await Schedule.findOne({
            employeeId: userId,
            date: today
        });

        // Determine session index
        const currentSessionIndex = attendance ? attendance.sessions.length : 0;

        // Determine Status & Late (Holiday check removed as per user request)
        let status = ATTENDANCE_STATUS.PRESENT;
        let isLate = false;
        let remarks = '';

        if (schedule) {
            if (schedule.shiftType === 'off') {
                status = ATTENDANCE_STATUS.WEEKEND;
                remarks = 'Worked on Off-day';
            } else if (schedule.startTime && schedule.startTime.length > 0) {
                // 1. Shift Limit Check: Check if user has already completed all scheduled shifts
                if (currentSessionIndex >= schedule.startTime.length) {
                    throw new BadRequestError(`You have already completed your ${schedule.startTime.length} scheduled shift(s) for today.`);
                }

                // 2. Time Buffer Check: Can only clock in within 30 mins before shift starts
                const shiftStartTimeStr = schedule.startTime[currentSessionIndex];
                const shiftStart = moment.tz(`${moment(today).format('YYYY-MM-DD')} ${shiftStartTimeStr}`, 'YYYY-MM-DD HH:mm', timezone);
                const checkInTime = moment(now).tz(timezone);

                const bufferStartTime = moment(shiftStart).subtract(30, 'minutes');

                if (checkInTime.isBefore(bufferStartTime)) {
                    throw new BadRequestError(`You can only clock in up to 30 minutes before your shift starts (Shift start: ${shiftStartTimeStr}).`);
                }

                // Check Late (grace period 15 mins)
                if (checkInTime.isAfter(moment(shiftStart).add(15, 'minutes'))) {
                    isLate = true;
                }
            }
        }

        let address = '';
        if (payload.latitude && payload.longitude) {
            try {
                const { reverseGeocode } = require('../utils/geocoder');
                address = await reverseGeocode(payload.latitude, payload.longitude);
            } catch (err) {
                logger.error('Failed to geocode clock-in location: ' + err.message);
            }
        }

        const sessionData = {
            checkIn: {
                time: now,
                ipAddress: payload.ipAddress,
                deviceInfo: payload.deviceInfo,
                latitude: payload.latitude,
                longitude: payload.longitude,
                address: address || undefined,
            },
            isLate
        };

        if (!attendance) {
            attendance = await Attendance.create({
                employeeId: userId,
                date: today,
                checkIn: sessionData.checkIn, // Set top-level checkIn as first session checkIn
                status,
                remarks: payload.remarks || remarks,
                sessions: [sessionData]
            });
        } else {
            attendance.sessions.push(sessionData);
            // Optionally update remarks if it was just "No schedule assigned" before
            if (payload.remarks) attendance.remarks = payload.remarks;
            await attendance.save();
        }

        if (payload.latitude && payload.longitude) {
            try {
                const LocationHistory = require('../models/LocationHistory');
                await LocationHistory.create({
                    userId,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    address,
                    ipAddress: payload.ipAddress,
                    userAgent: payload.deviceInfo,
                    type: 'clock_in',
                    loginAt: now
                });

                const User = require('../models/User');
                await User.findByIdAndUpdate(userId, {
                    lastActiveLocation: {
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        address,
                        updatedAt: now
                    }
                });
            } catch (err) {
                logger.error('Failed to log clock-in location history: ' + err.message);
            }
        }

        return attendance;
    },

    clockOut: async (userId, payload) => {
        const now = getRealTime();
        
        const user = await User.findById(userId).select('employment.timezone').lean();
        if (!user) throw new NotFoundError('User not found');
        
        const timezone = user.employment?.timezone || 'Asia/Kolkata';
        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();
        
        const attendance = await Attendance.findOne({
            employeeId: userId,
            date: today,
        });

        if (!attendance) {
            throw new BadRequestError('No attendance record found for today. Please clock in first.');
        }

        // Find last session
        const sessionIndex = attendance.sessions.length - 1;
        if (sessionIndex < 0) {
            throw new BadRequestError('No clock-in session found.');
        }

        const lastSession = attendance.sessions[sessionIndex];
        if (lastSession.checkOut && lastSession.checkOut.time) {
            throw new BadRequestError('Last session is already clocked out.');
        }

        // Check if on break
        const openBreak = attendance.breaks && attendance.breaks.find(b => !b.endTime);
        if (openBreak) {
            throw new BadRequestError('You are currently on break. Please resume work before clocking out.');
        }

        let address = '';
        if (payload.latitude && payload.longitude) {
            try {
                const { reverseGeocode } = require('../utils/geocoder');
                address = await reverseGeocode(payload.latitude, payload.longitude);
            } catch (err) {
                logger.error('Failed to geocode clock-out location: ' + err.message);
            }
        }

        // Close last session
        lastSession.checkOut = {
            time: now,
            ipAddress: payload.ipAddress,
            deviceInfo: payload.deviceInfo,
            latitude: payload.latitude,
            longitude: payload.longitude,
            address: address || undefined,
        };

        // Check for early leave based on schedule
        const schedule = await Schedule.findOne({ employeeId: userId, date: today });
        if (schedule && schedule.shiftType !== 'off' && schedule.endTime && schedule.endTime.length > sessionIndex) {
            const shiftEndTimeStr = schedule.endTime[sessionIndex];
            const shiftEnd = moment.tz(`${moment(today).format('YYYY-MM-DD')} ${shiftEndTimeStr}`, 'YYYY-MM-DD HH:mm', timezone);
            if (moment(now).tz(timezone).isBefore(shiftEnd)) {
                lastSession.isEarlyLeave = true;
            }
        }

        // Update top-level checkOut to be the latest session's checkOut
        attendance.checkOut = lastSession.checkOut;

        // Also update the global isEarlyLeave if ANY session had it? 
        // Or maybe only if the LAST session of the day had it.
        // Usually, isEarlyLeave for the day depends on the last scheduled shift.
        if (lastSession.isEarlyLeave) {
            attendance.isEarlyLeave = true;
        }

        // Update session in array
        attendance.sessions.set(sessionIndex, lastSession);
        attendance.markModified('sessions');

        await attendance.save(); // Hook calculates totalHours based on all sessions

        if (payload.latitude && payload.longitude) {
            try {
                const LocationHistory = require('../models/LocationHistory');
                await LocationHistory.create({
                    userId,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    address,
                    ipAddress: payload.ipAddress,
                    userAgent: payload.deviceInfo,
                    type: 'clock_out',
                    loginAt: now
                });

                const User = require('../models/User');
                await User.findByIdAndUpdate(userId, {
                    lastActiveLocation: {
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        address,
                        updatedAt: now
                    }
                });
            } catch (err) {
                logger.error('Failed to log clock-out location history: ' + err.message);
            }
        }
        return attendance;
    },

    startBreak: async (userId, breakTypeId) => {
        const now = getRealTime();
        const user = await User.findById(userId).select('employment.timezone').lean();
        const timezone = user?.employment?.timezone || 'Asia/Kolkata';
        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();
        const attendance = await Attendance.findOne({ employeeId: userId, date: today });

        if (!attendance) throw new BadRequestError('Not clocked in');

        // Ensure there is an open session
        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (!lastSession || (lastSession.checkOut && lastSession.checkOut.time)) {
            throw new BadRequestError('Please clock in before starting a break.');
        }

        // Check if already on break
        const openBreak = attendance.breaks && attendance.breaks.find(b => !b.endTime);
        if (openBreak) throw new BadRequestError('Already on break');

        // Check break limit for the current session
        const sessionStartTime = new Date(lastSession.checkIn.time);
        const breaksInSession = attendance.breaks.filter(b => new Date(b.startTime) >= sessionStartTime);

        if (breaksInSession.length >= 10) {
            throw new BadRequestError('You can take only 10 breaks in a session');
        }

        attendance.breaks.push({ 
            startTime: getRealTime(),
            breakType: breakTypeId 
        });
        await attendance.save();

        return attendance;
    },

    resumeWork: async (userId) => {
        const now = getRealTime();
        const user = await User.findById(userId).select('employment.timezone').lean();
        const timezone = user?.employment?.timezone || 'Asia/Kolkata';
        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();
        const attendance = await Attendance.findOne({ employeeId: userId, date: today });

        if (!attendance) throw new BadRequestError('Not clocked in');

        const breakIndex = attendance.breaks.findIndex(b => !b.endTime);
        if (breakIndex === -1) throw new BadRequestError('Not currently on break');

        const breakItem = attendance.breaks[breakIndex];
        breakItem.endTime = getRealTime();

        const durationMs = breakItem.endTime - breakItem.startTime;
        const durationMins = durationMs / (1000 * 60);

        breakItem.duration = durationMins;

        const BreakType = require('../models/BreakType');
        const breakTypeObj = await BreakType.findById(breakItem.breakType).lean();
        const isPaid = breakTypeObj ? breakTypeObj.isPaid === true : false;

        if (!isPaid) {
            attendance.breakTime = (attendance.breakTime || 0) + durationMins;
        } else {
            const maxDurationMins = breakTypeObj ? breakTypeObj.maxDuration : 0;
            if (maxDurationMins > 0 && durationMins > maxDurationMins) {
                const excessMins = durationMins - maxDurationMins;
                attendance.breakTime = (attendance.breakTime || 0) + excessMins;
            }
        }

        attendance.breaks.set(breakIndex, breakItem);

        await attendance.save();
        return attendance;
    },

    getAttendanceStatus: async (userId) => {
        const now = getRealTime();
        
        // Fetch user basic info including timezone
        const userBasic = await User.findById(userId).select('employment.timezone isHolidayApplicable').lean();
        const timezone = userBasic?.employment?.timezone || 'Asia/Kolkata';

        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();
        const monthStartStr = moment(now).tz(timezone).startOf('month').format('YYYY-MM-DD');
        const monthStart = moment.utc(monthStartStr).toDate();
        const monthEndStr = moment(now).tz(timezone).endOf('month').format('YYYY-MM-DD');
        const monthEnd = moment.utc(monthEndStr).toDate();

        const [attendance, holidays, schedules, monthlyAttendanceCount] = await Promise.all([
            Attendance.findOne({ employeeId: userId, date: today }).populate('breaks.breakType').lean(),
            holidayService.getHolidaysInRange(monthStart, monthEnd),
            Schedule.find({
                employeeId: userId,
                date: { $gte: monthStart, $lte: monthEnd }
            }).lean(),
            Attendance.countDocuments({
                employeeId: userId,
                date: { $gte: monthStart, $lte: today }
            })
        ]);

        // Calculate monthly off days and target hours
        const isHolidayApplicable = userBasic ? userBasic.isHolidayApplicable : true;
        const holidayDates = isHolidayApplicable ? holidays.map(h => moment(h.date).tz(timezone).format('YYYY-MM-DD')) : [];
        const shiftDates = schedules.filter(s => s.shiftType !== 'off').map(s => moment(s.date).tz(timezone).format('YYYY-MM-DD'));

        let monthlyTargetHours = 0;
        schedules.forEach(s => {
            if (s.shiftType !== 'off' && s.startTime && s.endTime) {
                const len = Math.min(s.startTime.length, s.endTime.length);
                for (let i = 0; i < len; i++) {
                    const start = moment.tz(s.startTime[i], 'HH:mm', timezone);
                    const end = moment.tz(s.endTime[i], 'HH:mm', timezone);
                    if (end.isAfter(start)) {
                        monthlyTargetHours += end.diff(start, 'hours', true);
                    }
                }
            }
        });

        const offDays = [];
        const daysInMonth = moment(now).tz(timezone).daysInMonth();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = moment(now).tz(timezone).date(i).format('YYYY-MM-DD');
            if (!holidayDates.includes(dateStr) && !shiftDates.includes(dateStr)) {
                offDays.push(dateStr);
            }
        }

        // Calculate Attendance Percentage (Present Days / Expected Work Days So Far)
        let expectedWorkDaysSoFar = 0;
        const currentMoment = moment(monthStart).tz(timezone);
        const todayMoment = moment(today).tz(timezone);

        while (currentMoment.isSameOrBefore(todayMoment)) {
            const dateStr = currentMoment.format('YYYY-MM-DD');
            // A day is expected working if it's in shiftDates AND not a holiday
            if (shiftDates.includes(dateStr) && !holidayDates.includes(dateStr)) {
                expectedWorkDaysSoFar++;
            }
            currentMoment.add(1, 'day');
        }

        const monthlyAttendancePercentage = expectedWorkDaysSoFar > 0
            ? Number(((monthlyAttendanceCount / expectedWorkDaysSoFar) * 100).toFixed(2))
            : 0;

        const monthlyOffStats = {
            monthlyOffDays: offDays,
            monthlyOffDaysCount: offDays.length,
            monthlyPresentDays: monthlyAttendanceCount,
            monthlyWorkingDaysSoFar: expectedWorkDaysSoFar,
            monthlyTargetHours: Number(monthlyTargetHours.toFixed(2)),
            monthlyAttendancePercentage
        };

        // Check for incomplete shifts (from previous days)
        const incompleteAttendance = await Attendance.findOne({
            employeeId: userId,
            date: { $lt: today },
            $or: [
                { 'sessions.checkOut.time': { $exists: false } },
                { checkOut: { $exists: false } }
            ]
        }).sort({ date: -1 }).lean();

        let logoutCorrectionData = null;
        if (incompleteAttendance) {
            const lastSession = incompleteAttendance.sessions[incompleteAttendance.sessions.length - 1];
            if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
                logoutCorrectionData = {
                    requiresLogoutCorrection: true,
                    incompleteShift: {
                        shiftId: incompleteAttendance._id,
                        loginTime: lastSession.checkIn.time,
                        shiftDate: moment(incompleteAttendance.date).tz(timezone).format('YYYY-MM-DD')
                    }
                };
            }
        }

        if (!attendance) {
            return {
                isClockedIn: false,
                isOnBreak: false,
                currentSession: null,
                currentBreak: null,
                totalSessions: 0,
                totalBreakTime: 0,
                totalHours: 0,
                timestamp: getRealTime(),
                ...monthlyOffStats,
                ...(logoutCorrectionData || { requiresLogoutCorrection: false })
            };
        }

        const enriched = enrichAttendanceRecord(attendance, timezone);
        const lastSession = enriched.sessions[enriched.sessions.length - 1];
        const lastBreak = enriched.breaks[enriched.breaks.length - 1];
        const isClockedIn = !!(lastSession && (!lastSession.checkOut || !lastSession.checkOut.time));
        const isOnBreak = !!(lastBreak && !lastBreak.endTime);

        return {
            isClockedIn,
            isOnBreak,
            currentSession: isClockedIn ? lastSession : null,
            currentBreak: isOnBreak ? lastBreak : null,
            totalSessions: enriched.sessions.length,
            totalBreakCount: enriched.breaks ? enriched.breaks.length : 0,
            totalBreakTime: enriched.totalBreakTime,
            totalBreakDurationString: enriched.totalBreakDurationString,
            totalHours: enriched.totalHours,
            totalDurationString: enriched.totalDurationString,
            status: enriched.status,
            remarks: enriched.remarks,
            timestamp: getRealTime(),
            ...monthlyOffStats,
            ...(logoutCorrectionData || { requiresLogoutCorrection: false })
        };
    },

    getAllAttendance: async (query) => {
        const { page = 1, limit = 20, employeeId, startDate, endDate, status, search, department, designation, isClockedIn, isOnBreak, adminUserId } = query;
        const skip = (page - 1) * limit;

        const filter = {};

        // Handle User-related filters (search, department, designation)
        if (search || department || designation) {
            const userFilter = {};
            if (department) userFilter['employment.department'] = { $regex: department, $options: 'i' };
            if (designation) userFilter['employment.designation'] = { $regex: designation, $options: 'i' };
            if (search) {
                userFilter.$or = [
                    { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                                regex: search,
                                options: 'i',
                            },
                        },
                    },
                ];
            }
            const matchingUsers = await User.find(userFilter).select('_id').lean();
            const userIds = matchingUsers.map(u => u._id);

            if (employeeId) {
                // If both employeeId and user filters are provided, intersect them
                if (userIds.some(id => id.toString() === employeeId.toString())) {
                    filter.employeeId = employeeId;
                } else {
                    // No intersection, return empty
                    return { attendance: [], pagination: { total: 0, page: Number(page), limit: Number(limit), pages: 0 } };
                }
            } else {
                filter.employeeId = { $in: userIds };
            }
        } else if (employeeId) {
            filter.employeeId = employeeId;
        }

        if (status) {
            if (status === 'Late') {
                filter.isLate = true;
            } else {
                filter.status = status;
            }
        }
        if (startDate || endDate) {
            filter.date = {};
            let TZ = 'Asia/Kolkata';
            const targetUserId = employeeId || adminUserId;
            if (targetUserId) {
                const tzUser = await User.findById(targetUserId).select('employment.timezone').lean();
                if (tzUser?.employment?.timezone) {
                    TZ = tzUser.employment.timezone;
                }
            }
            if (startDate) filter.date.$gte = moment.tz(startDate.length === 10 ? startDate : moment(startDate).tz(TZ).format('YYYY-MM-DD'), 'YYYY-MM-DD', TZ).startOf('day').toDate();
            if (endDate) filter.date.$lte = moment.tz(endDate.length === 10 ? endDate : moment(endDate).tz(TZ).format('YYYY-MM-DD'), 'YYYY-MM-DD', TZ).endOf('day').toDate();
        }

        // Real-time status filters
        if (isClockedIn !== undefined) {
            if (isClockedIn === true || isClockedIn === 'true') {
                filter.sessions = { $elemMatch: { 'checkOut.time': { $exists: false } } };
            } else {
                filter.sessions = { $not: { $elemMatch: { 'checkOut.time': { $exists: false } } } };
            }
        }

        if (isOnBreak !== undefined) {
            if (isOnBreak === true || isOnBreak === 'true') {
                filter.breaks = { $elemMatch: { 'endTime': { $exists: false } } };
            } else {
                filter.breaks = { $not: { $elemMatch: { 'endTime': { $exists: false } } } };
            }
        }

        const attendanceRecords = await Attendance.find(filter)
            .populate('employeeId', 'username personalInfo.firstName personalInfo.lastName personalInfo.email isHolidayApplicable employment.timezone')
            .populate('breaks.breakType')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Fetch holidays for the date range
        const dates = attendanceRecords.map(r => r.date);
        const startDate_ = dates.length > 0 ? moment.min(dates.map(d => moment(d))).toDate() : null;
        const endDate_ = dates.length > 0 ? moment.max(dates.map(d => moment(d))).toDate() : null;
        const holidays = (startDate_ && endDate_) ? await holidayService.getHolidaysInRange(startDate_, endDate_) : [];

        const holidayDates = holidays.map(h => moment(h.date).format('YYYY-MM-DD')); // Holidays in DB are already calendar dates

        // Add fullName and holiday info
        const attendance = attendanceRecords.map(record => {
            if (record.employeeId && record.employeeId.personalInfo) {
                record.employeeId.fullName = `${record.employeeId.personalInfo.firstName} ${record.employeeId.personalInfo.lastName}`;
            }

            // Check holiday
            const userTimezone = record.employeeId?.employment?.timezone || 'Asia/Kolkata';
            const dateStr = moment(record.date).tz(userTimezone).format('YYYY-MM-DD');
            record.isHoliday = holidayDates.includes(dateStr) && (record.employeeId ? record.employeeId.isHolidayApplicable : true);
            if (record.isHoliday) {
                const holiday = holidays.find(h => moment(h.date).format('YYYY-MM-DD') === dateStr);
                record.holidayName = holiday ? holiday.name : 'Holiday';
            }

            // Enrich with duration strings
            return enrichAttendanceRecord(record, record.employeeId?.employment?.timezone);
        });

        const total = await Attendance.countDocuments(filter);

        return {
            attendance,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        };
    },

    getIndividualAttendance: async (userId, query) => {
        const { page = 1, limit = 20, startDate, endDate, status } = query;
        const skip = (page - 1) * limit;

        const filter = { employeeId: userId };
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            const tzUser = await User.findById(userId).select('employment.timezone').lean();
            const TZ = tzUser?.employment?.timezone || 'Asia/Kolkata';
            if (startDate) filter.date.$gte = moment.tz(startDate.length === 10 ? startDate : moment(startDate).tz(TZ).format('YYYY-MM-DD'), 'YYYY-MM-DD', TZ).startOf('day').toDate();
            if (endDate) filter.date.$lte = moment.tz(endDate.length === 10 ? endDate : moment(endDate).tz(TZ).format('YYYY-MM-DD'), 'YYYY-MM-DD', TZ).endOf('day').toDate();
        }

        const attendanceRecords = await Attendance.find(filter)
            .populate('employeeId', 'username personalInfo.firstName personalInfo.lastName personalInfo.email isHolidayApplicable employment.timezone')
            .populate('breaks.breakType')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Fetch holidays for the date range
        const dates = attendanceRecords.map(r => r.date);
        const startDate_ = dates.length > 0 ? moment.min(dates.map(d => moment(d))).toDate() : null;
        const endDate_ = dates.length > 0 ? moment.max(dates.map(d => moment(d))).toDate() : null;
        const holidays = (startDate_ && endDate_) ? await holidayService.getHolidaysInRange(startDate_, endDate_) : [];

        const userDetailed = await User.findById(userId).select('employment.timezone').lean();
        const userTimezone = userDetailed?.employment?.timezone || 'Asia/Kolkata';
        const holidayDates = holidays.map(h => moment(h.date).format('YYYY-MM-DD'));

        // Add fullName and holiday info
        const attendance = attendanceRecords.map(record => {
            if (record.employeeId && record.employeeId.personalInfo) {
                record.employeeId.fullName = `${record.employeeId.personalInfo.firstName} ${record.employeeId.personalInfo.lastName}`;
            }

            // Check holiday
            const dateStr = moment(record.date).tz(userTimezone).format('YYYY-MM-DD');
            record.isHoliday = holidayDates.includes(dateStr) && (record.employeeId ? record.employeeId.isHolidayApplicable : true);
            if (record.isHoliday) {
                const holiday = holidays.find(h => moment(h.date).format('YYYY-MM-DD') === dateStr);
                record.holidayName = holiday ? holiday.name : 'Holiday';
            }

            // Enrich with duration strings
            return enrichAttendanceRecord(record, record.employeeId?.employment?.timezone);
        });

        const total = await Attendance.countDocuments(filter);

        return {
            attendance,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        };
    },

    getAttendanceById: async (id) => {
        const attendance = await Attendance.findById(id)
            .populate('employeeId', 'username personalInfo.firstName personalInfo.lastName personalInfo.email isHolidayApplicable employment.timezone')
            .populate('breaks.breakType')
            .lean();

        if (!attendance) {
            throw new NotFoundError('Attendance record not found');
        }

        // Add fullName
        if (attendance.employeeId && attendance.employeeId.personalInfo) {
            attendance.employeeId.fullName = `${attendance.employeeId.personalInfo.firstName} ${attendance.employeeId.personalInfo.lastName}`;
        }

        // Check holiday
        const employeeTimezone = attendance.employeeId?.employment?.timezone || 'Asia/Kolkata';
        const attendanceDate = moment(attendance.date).tz(employeeTimezone).startOf('day').toDate();
        const holidays_ = await holidayService.getHolidaysInRange(attendanceDate, attendanceDate);
        const holiday = holidays_[0];

        if (holiday && (attendance.employeeId ? attendance.employeeId.isHolidayApplicable : true)) {
            attendance.isHoliday = true;
            attendance.holidayName = holiday.name;
        } else {
            attendance.isHoliday = false;
        }

        // Enrich with duration strings
        return enrichAttendanceRecord(attendance, attendance.employeeId?.employment?.timezone);
    },

    correctLogout: async (userId, payload) => {
        const { shiftId, logoutTime, shiftDate, reason, remarks } = payload;
        
        const user = await User.findById(userId).select('employment.timezone').lean();
        const timezone = user?.employment?.timezone || 'Asia/Kolkata';

        const attendance = await Attendance.findOne({
            _id: shiftId,
            employeeId: userId
        });

        if (!attendance) {
            throw new NotFoundError('Attendance record not found or unauthorized');
        }

        // Check if there is an incomplete session
        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (lastSession.checkOut && lastSession.checkOut.time) {
            throw new BadRequestError('This shift already has a logout time.');
        }

        const loginTime = new Date(lastSession.checkIn.time);
        const logoutDate = new Date(logoutTime);

        if (logoutDate <= loginTime) {
            throw new BadRequestError('Logout time must be after login time.');
        }

        // Update the session
        lastSession.checkOut = {
            time: logoutDate,
            ipAddress: 'System-Correction',
            deviceInfo: 'Logout-Correction-Page'
        };

        // Update top-level checkOut
        attendance.checkOut = lastSession.checkOut;

        // Add correction metadata
        attendance.remarks = `[Correction: ${reason}] ${remarks || ''}`.trim();
        attendance.correctedBy = userId;
        attendance.correctedAt = new Date();
        attendance.correctionSource = 'manual';

        attendance.sessions.set(attendance.sessions.length - 1, lastSession);
        attendance.markModified('sessions');

        await attendance.save();
        
        const enriched = enrichAttendanceRecord(attendance.toObject(), timezone);
        return enriched;
    },

    getIncompleteShiftStatus: async (userId) => {
        const now = getRealTime();
        const user = await User.findById(userId).select('employment.timezone').lean();
        const timezone = user?.employment?.timezone || 'Asia/Kolkata';
        
        const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
        const today = moment.utc(todayStr).toDate();
        const incompleteAttendance = await Attendance.findOne({
            employeeId: userId,
            date: { $lt: today },
            $or: [
                { 'sessions.checkOut.time': { $exists: false } },
                { checkOut: { $exists: false } }
            ]
        }).sort({ date: -1 }).lean();

        if (incompleteAttendance) {
            const lastSession = incompleteAttendance.sessions[incompleteAttendance.sessions.length - 1];
            if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
                return {
                    requiresLogoutCorrection: true,
                    shiftId: incompleteAttendance._id,
                    loginTime: lastSession.checkIn.time,
                    shiftDate: moment(incompleteAttendance.date).tz(timezone).format('YYYY-MM-DD'),
                    timestamp: getRealTime()
                };
            }
        }

        return { requiresLogoutCorrection: false };
    },

    getSummary: async ({ page = 1, limit = 20, startDate, endDate, department, designation, search, status, isLate, adminUserId }) => {
        const skip = (page - 1) * limit;
        
        // Dynamically fetch admin/requester timezone
        let DEFAULT_TZ = 'Asia/Kolkata';
        if (adminUserId) {
            const adminUser = await User.findById(adminUserId).select('employment.timezone').lean();
            if (adminUser?.employment?.timezone) DEFAULT_TZ = adminUser.employment.timezone;
        }

        const startStr = startDate || moment(getRealTime()).tz(DEFAULT_TZ).format('YYYY-MM-DD');
        const endStr = endDate || moment(getRealTime()).tz(DEFAULT_TZ).format('YYYY-MM-DD');
        const start = moment.tz(startStr, 'YYYY-MM-DD', DEFAULT_TZ).startOf('day').toDate();
        const end = moment.tz(endStr, 'YYYY-MM-DD', DEFAULT_TZ).endOf('day').toDate();

        // 1. Build User Filter
        const userFilter = { isActive: true };
        if (department && department !== 'all') userFilter['employment.department'] = { $regex: department, $options: 'i' };
        if (designation && designation !== 'all') userFilter['employment.designation'] = { $regex: designation, $options: 'i' };
        if (search) {
            userFilter.$or = [
                { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                            regex: search,
                            options: 'i',
                        },
                    },
                },
            ];
        }

        // 2. Fetch Users (Paginated)
        const totalUsers = await User.countDocuments(userFilter);
        const users = await User.find(userFilter)
            .select('personalInfo employment username employeeId isHolidayApplicable')
            .skip(skip)
            .limit(limit)
            .lean();

        const userIds = users.map(u => u._id);

        // 3. Fetch Attendance Records for these users in range
        const attendanceRecords = await Attendance.find({
            employeeId: { $in: userIds },
            date: { $gte: start, $lte: end }
        }).lean();

        // 4. Fetch Holidays and Leaves
        const [holidays, leaves] = await Promise.all([
            holidayService.getHolidaysInRange(start, end),
            Leave.find({
                employeeId: { $in: userIds },
                status: 'approved',
                $or: [
                    { startDate: { $lte: end }, endDate: { $gte: start } }
                ]
            }).lean()
        ]);

        const holidayDates = holidays.map(h => moment(h.date).format('YYYY-MM-DD'));

        // 5. Build Combined Attendance List
        const attendance = users.map(user => {
            const record = attendanceRecords.find(r => r.employeeId.toString() === user._id.toString());
            const userTimezone = user.employment?.timezone || 'Asia/Kolkata';
            const dateStr = moment(start).tz(userTimezone).format('YYYY-MM-DD');
            const dayName = moment(start).tz(userTimezone).format('dddd');

            // Find Leave
            const leave = leaves.find(l => {
                const lStart = moment(l.startDate).tz(userTimezone).startOf('day');
                const lEnd = moment(l.endDate).tz(userTimezone).endOf('day');
                return moment(start).tz(userTimezone).isBetween(lStart, lEnd, 'day', '[]');
            });

            // Is Holiday
            const isHoliday = holidayDates.includes(dateStr) && (user.isHolidayApplicable !== false);
            
            // Is Weekend (Simple check for now, can be improved with Schedule logic)
            const isWeekend = user.employment?.workingHours?.weeklyOff?.includes(dayName) || false;

            if (record) {
                return {
                    ...enrichAttendanceRecord(record, user.employment?.timezone),
                    name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
                    email: user.personalInfo?.email,
                    department: user.employment?.department
                };
            }

            // Determine non-present status
            let calculatedStatus = ATTENDANCE_STATUS.ABSENT;
            if (leave) calculatedStatus = ATTENDANCE_STATUS.ON_LEAVE;
            else if (isHoliday) calculatedStatus = ATTENDANCE_STATUS.HOLIDAY;
            else if (isWeekend) calculatedStatus = ATTENDANCE_STATUS.WEEKEND;

            return {
                _id: user._id,
                employeeId: user._id,
                date: start,
                status: calculatedStatus,
                name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
                email: user.personalInfo?.email,
                department: user.employment?.department,
                isLate: false,
                punctuality: '-',
                totalHours: 0,
                totalDurationString: '0S',
                sessions: [],
                breaks: []
            };
        });

        // 6. Post-mapping filter if status was provided (since we joined simulated data)
        // Note: For large datasets, this strategy needs change to true aggregation join
        let finalAttendance = attendance;
        if (status && status !== 'all') {
            finalAttendance = finalAttendance.filter(a => a.status.toLowerCase() === status.toLowerCase());
        }
        if (isLate === true || isLate === 'true') {
            finalAttendance = finalAttendance.filter(a => a.isLate);
        }

        return {
            attendance: finalAttendance,
            pagination: {
                total: totalUsers,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(totalUsers / limit)
            }
        };
    },

    getStats: async ({ date, department, designation, adminUserId }) => {
        // Dynamically fetch admin/requester timezone
        let DEFAULT_TZ = 'Asia/Kolkata';
        if (adminUserId) {
            const adminUser = await User.findById(adminUserId).select('employment.timezone').lean();
            if (adminUser?.employment?.timezone) DEFAULT_TZ = adminUser.employment.timezone;
        }

        const dateStr = date ? (typeof date === 'string' && date.length === 10 ? date : moment(date).tz(DEFAULT_TZ).format('YYYY-MM-DD')) : moment(getRealTime()).tz(DEFAULT_TZ).format('YYYY-MM-DD');
        const start = moment.tz(dateStr, 'YYYY-MM-DD', DEFAULT_TZ).startOf('day').toDate();
        const end = moment.tz(dateStr, 'YYYY-MM-DD', DEFAULT_TZ).endOf('day').toDate();

        // 1. Build User Filter
        const userFilter = { isActive: true };
        if (department && department !== 'all') userFilter['employment.department'] = { $regex: department, $options: 'i' };
        if (designation && designation !== 'all') userFilter['employment.designation'] = { $regex: designation, $options: 'i' };

        const totalActiveEmployees = await User.countDocuments(userFilter);
        const activeUserIds = await User.find(userFilter).distinct('_id');

        // 2. Fetch specific counts
        const [presentRecords, onLeaveCount] = await Promise.all([
            Attendance.find({
                employeeId: { $in: activeUserIds },
                date: { $gte: start, $lte: end },
                status: ATTENDANCE_STATUS.PRESENT
            }).lean(),
            Leave.countDocuments({
                employeeId: { $in: activeUserIds },
                status: 'approved',
                startDate: { $lte: end },
                endDate: { $gte: start }
            })
        ]);

        const presentCount = presentRecords.length;
        const lateCount = presentRecords.filter(r => r.isLate).length;
        
        // Absent logic: Active - Present - Leave (Holidays/Weekends usually counted separately in UI or shown as Absent if not exempt)
        // For simplicity matching UI cards:
        const absentCount = Math.max(0, totalActiveEmployees - presentCount - onLeaveCount);

        return {
            total: totalActiveEmployees,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            onLeave: onLeaveCount,
            halfDay: presentRecords.filter(r => r.status === ATTENDANCE_STATUS.HALF_DAY).length
        };
    },

    getDailyTimeline: async (date, userId) => {
        const user = await User.findById(userId)
            .select('username personalInfo.firstName personalInfo.lastName personalInfo.email employment.department employment.designation employment.timezone isHolidayApplicable')
            .lean();
        if (!user) {
            throw new NotFoundError('User not found');
        }
        if (user.personalInfo) {
            user.fullName = `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
        }

        const timezone = user.employment?.timezone || 'Asia/Kolkata';
        const startOfDay = moment.tz(date, timezone).startOf('day').toDate();
        const endOfDay = moment.tz(date, timezone).endOf('day').toDate();

        const targetDateStr = moment.tz(date, timezone).format('YYYY-MM-DD');
        const targetDate = moment.utc(targetDateStr).toDate();

        let attendance = await Attendance.findOne({
            employeeId: userId,
            date: targetDate,
        })
        .populate('breaks.breakType')
        .lean();

        if (attendance) {
            attendance.employeeId = {
                _id: user._id,
                username: user.username,
                personalInfo: user.personalInfo,
                fullName: user.fullName,
                employment: user.employment,
                isHolidayApplicable: user.isHolidayApplicable
            };
            const holidays_ = await holidayService.getHolidaysInRange(startOfDay, endOfDay);
            const holiday = holidays_[0];
            if (holiday && (user.isHolidayApplicable !== false)) {
                attendance.isHoliday = true;
                attendance.holidayName = holiday.name;
            } else {
                attendance.isHoliday = false;
            }
            attendance = enrichAttendanceRecord(attendance, timezone);
        }

        const LocationHistory = require('../models/LocationHistory');
        const locationRecords = await LocationHistory.find({
            userId,
            loginAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        })
        .sort({ loginAt: 1 })
        .lean();

        const timeline = [];

        if (attendance) {
            if (attendance.sessions) {
                attendance.sessions.forEach((session, index) => {
                    if (session.checkIn && session.checkIn.time) {
                        timeline.push({
                            type: 'clock_in',
                            time: session.checkIn.time,
                            latitude: session.checkIn.latitude,
                            longitude: session.checkIn.longitude,
                            address: session.checkIn.address,
                            ipAddress: session.checkIn.ipAddress,
                            deviceInfo: session.checkIn.deviceInfo,
                            remarks: index === 0 ? attendance.remarks : undefined,
                            sessionIndex: index
                        });
                    }
                    if (session.checkOut && session.checkOut.time) {
                        timeline.push({
                            type: 'clock_out',
                            time: session.checkOut.time,
                            latitude: session.checkOut.latitude,
                            longitude: session.checkOut.longitude,
                            address: session.checkOut.address,
                            ipAddress: session.checkOut.ipAddress,
                            deviceInfo: session.checkOut.deviceInfo,
                            durationString: session.durationString,
                            sessionIndex: index
                        });
                    }
                });
            }

            if (attendance.breaks) {
                attendance.breaks.forEach((b, index) => {
                    if (b.startTime) {
                        timeline.push({
                            type: 'break_start',
                            time: b.startTime,
                            breakType: b.breakType,
                            breakIndex: index
                        });
                    }
                    if (b.endTime) {
                        timeline.push({
                            type: 'break_end',
                            time: b.endTime,
                            breakType: b.breakType,
                            durationString: b.durationString,
                            breakIndex: index
                        });
                    }
                });
            }
        }

        if (locationRecords && locationRecords.length > 0) {
            locationRecords.forEach(record => {
                if (record.type === 'clock_in' || record.type === 'clock_out') {
                    return;
                }
                timeline.push({
                    type: 'location_update',
                    originalType: record.type,
                    time: record.loginAt,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    address: record.address,
                    ipAddress: record.ipAddress,
                    deviceInfo: record.userAgent
                });
            });
        }

        timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

        if (!attendance) {
            attendance = {
                date: targetDate,
                employeeId: {
                    _id: user._id,
                    username: user.username,
                    personalInfo: user.personalInfo,
                    fullName: user.fullName,
                    employment: user.employment,
                    isHolidayApplicable: user.isHolidayApplicable
                },
                sessions: [],
                breaks: [],
                status: 'absent',
                totalHours: 0,
                totalBreakTime: 0,
                timeline: timeline
            };
        } else {
            attendance.timeline = timeline;
        }

        return attendance;
    }
};

module.exports = attendanceService;
