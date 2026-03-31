const Leave = require('../models/Leave');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');
const Schedule = require('../models/Schedule');
const { AppError, BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { calculateDaysBetween } = require('../utils/dateUtils');
const mongoose = require('mongoose');

// Helper to calculate days (excluding weekly offs and holidays)
const calculateLeaveDays = (start, end, halfDay, userSettings = {}) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const { weeklyOff = [], holidays = [], isHolidayApplicable = true, schedules = [] } = userSettings;

    // Create a map for quick schedule lookup: "YYYY-MM-DD" -> scheduleDoc
    const scheduleMap = new Map();
    schedules.forEach(s => {
        const dateKey = new Date(s.date).toISOString().split('T')[0];
        scheduleMap.set(dateKey, s);
    });

    let days = 0;
    let current = new Date(startDate);

    while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0];
        const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });

        // Check if it's a holiday
        // If user is NOT applicable for holidays, then a holiday counts as a working day (unless it's a week off)
        // Wait, requirement: "holiday is not count in a leave if user applicable for leave"
        // So ONLY if isHolidayApplicable AND it is a holiday, we skip counting.
        const isHoliday = isHolidayApplicable && holidays.some(h => {
            const hDate = new Date(h.date);
            return hDate.toISOString().split('T')[0] === dateKey;
        });

        // Check if it's a weekly off
        // Priority: Schedule > Default Weekly Off
        let isWeeklyOff = false;

        if (scheduleMap.has(dateKey)) {
            const schedule = scheduleMap.get(dateKey);
            isWeeklyOff = schedule.shiftType === 'off';
        } else {
            // Fallback to default weekly off if no schedule generated yet
            isWeeklyOff = weeklyOff.includes(dayOfWeek);
        }

        if (!isWeeklyOff && !isHoliday) {
            days++;
        }

        current.setDate(current.getDate() + 1);
    }

    if (halfDay) {
        // If the single day selected is a holiday or weekly off, days will be 0
        if (days === 0) {
            throw new BadRequestError('Cannot apply for half-day leave on a holiday or weekly off.');
        }
        return 0.5;
    }
    return days;
};

const leaveController = {
    // Calculate leave duration (days)
    calculateLeaveDuration: async (req, res) => {
        const { startDate, endDate } = req.query;
        const halfDay = req.query.halfDay === 'true'; // Parse string "true" to boolean true
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        // Fetch holidays for the period
        const holidays = await Holiday.find({
            isActive: true,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Fetch schedules for the period
        const schedules = await Schedule.find({
            employeeId: userId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        const userSettings = {
            weeklyOff: user.employment?.workingHours?.weeklyOff || [],
            holidays,
            isHolidayApplicable: user.isHolidayApplicable !== false,
            schedules
        };

        const numberOfDays = calculateLeaveDays(startDate, endDate, halfDay, userSettings);

        res.json({
            status: 'success',
            data: {
                numberOfDays
            }
        });
    },

    // Create a new leave request
    createLeaveRequest: async (req, res) => {
        const { leaveType, startDate, endDate, halfDay, halfDayType, reason, attachments } = req.body;
        const userId = req.user._id;

        // Check for overlapping leaves
        const overlapping = await Leave.findOverlapping(userId, startDate, endDate);
        if (overlapping.length > 0) {
            throw new BadRequestError('You already have a leave request for this period.');
        }

        // Initial check for leave balance
        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        // Fetch holidays for the period
        const holidays = await Holiday.find({
            isActive: true,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Fetch schedules for the period to check for roster-based offs
        const schedules = await Schedule.find({
            employeeId: userId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        const userSettings = {
            weeklyOff: user.employment?.workingHours?.weeklyOff || [],
            holidays,
            isHolidayApplicable: user.isHolidayApplicable !== false,
            schedules
        };

        const numberOfDays = calculateLeaveDays(startDate, endDate, halfDay, userSettings);

        if (numberOfDays <= 0) {
            throw new BadRequestError('The selected date range only contains holidays or weekly offs.');
        }

        const userDept = user.employment?.department;

        // Fetch leave type configuration - search by code or name, and check department
        const leaveTypeInfo = await LeaveType.findOne({
            $or: [
                { code: leaveType.toUpperCase() },
                { name: new RegExp(`^${leaveType}$`, 'i') }
            ],
            isActive: true,
            applicableDepartments: { $in: ['all', userDept] }
        });

        // Check applicability
        if (leaveType.toLowerCase() !== 'unpaid' && !leaveTypeInfo) {
            throw new ForbiddenError(`This leave type is either invalid or not applicable to your department (${userDept}).`);
        }

        const canonicalName = leaveTypeInfo ? leaveTypeInfo.name : leaveType;
        const isUnpaid = leaveType.toLowerCase() === 'unpaid' ||
            (leaveTypeInfo && leaveTypeInfo.isPaid === false) ||
            (leaveTypeInfo && leaveTypeInfo.code === 'LWP');

        // Dynamic Balance Calculation (Allocated - Taken/Pending)
        let currentBalance = 0;
        if (isUnpaid) {
            currentBalance = Infinity;
        } else if (leaveTypeInfo) {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

            // Fetch Approved + Pending leaves for THIS type for current year
            const leavesTaken = await Leave.find({
                employeeId: userId,
                leaveType: { $in: [leaveTypeInfo.name, leaveTypeInfo.code] },
                status: { $in: ['approved', 'pending'] },
                startDate: { $gte: startOfYear, $lte: endOfYear }
            });

            const totalTaken = leavesTaken.reduce((sum, l) => sum + l.numberOfDays, 0);
            currentBalance = Math.max(0, (leaveTypeInfo.defaultAmount || 0) - totalTaken);
        }

        // console.log(`Dynamic Balance for ${canonicalName}: ${currentBalance}`);

        // Policy logic
        if (!isUnpaid && currentBalance < numberOfDays) {
            throw new BadRequestError(`Insufficient ${leaveType} leave balance. Available: ${currentBalance}, Requested: ${numberOfDays}`);
        }

        const leave = await Leave.create({
            employeeId: userId,
            leaveType: leaveTypeInfo ? leaveTypeInfo.name : leaveType,
            startDate,
            endDate,
            numberOfDays,
            halfDay,
            halfDayType,
            reason,
            attachments,
            status: 'pending',
        });

        res.status(201).json({
            status: 'success',
            data: leave,
        });
    },

    // Get all leave requests (Admin/Manager)
    getLeaveRequests: async (req, res) => {
        const { page = 1, limit = 20, status, userId, leaveType, search } = req.query;
        const query = {};

        if (status) query.status = status;
        if (userId) query.employeeId = userId;
        if (leaveType) query.leaveType = leaveType;

        if (search) {
            const users = await User.find({
                $or: [
                    { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                    { 'personalInfo.email': { $regex: search, $options: 'i' } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                                regex: search,
                                options: 'i',
                            },
                        },
                    },
                ],
            }).select('_id');

            const userIds = users.map((user) => user._id);
            if (query.employeeId) {
                if (!userIds.some(id => id.equals(query.employeeId))) {
                    return res.json({
                        status: 'success',
                        data: [],
                        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
                    });
                }
            } else {
                query.employeeId = { $in: userIds };
            }
        }

        // RBAC & Hierarchy Filtering
        const userRole = (req.user.employment?.role || '').toLowerCase();
        const canApprove = req.user.permissions?.canApproveLeave || false;
        const isAdminOrHR = userRole === 'admin' || userRole === 'hr' || userRole === 'super admin' || req.user.isAdmin;

        // If user is Admin/HR or has explicit approve permission, they can see everything (filters apply normally)
        if (!isAdminOrHR && !canApprove) {
            if (userRole === 'manager') {
                // Find all subordinates (direct and indirect) using recursive search
                const hierarchyData = await User.aggregate([
                    { $match: { _id: req.user._id } },
                    {
                        $graphLookup: {
                            from: 'users',
                            startWith: '$_id',
                            connectFromField: '_id',
                            connectToField: 'employment.reportingManager',
                            as: 'allSubordinates'
                        }
                    },
                    {
                        $project: {
                            allSubordinateIds: '$allSubordinates._id'
                        }
                    }
                ]);

                const subordinateIds = hierarchyData[0]?.allSubordinateIds || [];
                // Managers can see their own + subordinates
                const allowedIds = [...subordinateIds, req.user._id];

                if (query.employeeId) {
                    const targetId = mongoose.Types.ObjectId.isValid(query.employeeId)
                        ? new mongoose.Types.ObjectId(query.employeeId)
                        : query.employeeId;

                    if (!allowedIds.some(sid => sid.equals(targetId))) {
                        return res.json({
                            status: 'success',
                            data: [],
                            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
                        });
                    }
                } else {
                    query.employeeId = { $in: allowedIds };
                }
            } else {
                // Regular employees: If they hit this route, restrict to their OWN requests
                if (query.employeeId && query.employeeId.toString() !== req.user._id.toString()) {
                    return res.json({
                        status: 'success',
                        data: [],
                        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
                    });
                }
                query.employeeId = req.user._id;
            }
        }

        const leaves = await Leave.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employment.designation employment.reportingManager')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Leave.countDocuments(query);

        res.json({
            status: 'success',
            data: leaves,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    },

    // Get current user's leave requests
    getMyLeaveRequests: async (req, res) => {
        const { page = 1, limit = 20, status, leaveType, search } = req.query;
        const userId = req.user._id;
        const query = { employeeId: userId };

        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;

        if (search) {
            query.reason = { $regex: search, $options: 'i' };
        }

        const leaves = await Leave.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Leave.countDocuments(query);

        res.json({
            status: 'success',
            data: leaves,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    },

    // Get Leave Balance
    getLeaveBalance: async (req, res) => {
        // If Admin/Manager requests for another user, use params.userId
        // Else use req.user._id
        let targetUserId = req.user._id;

        if (req.params.userId) {
            // Check permission: Admin or Manager of that user
            // For simplicity, allowing Admin/HR or self
            if (req.user.employment.role === 'admin' || req.user.employment.role === 'hr' || req.user.employment.role === 'manager') {
                targetUserId = req.params.userId;
            } else if (req.params.userId !== req.user._id.toString()) {
                throw new ForbiddenError('You can only view your own leave balance.');
            }
        }

        const user = await User.findById(targetUserId).select('leaveBalance personalInfo employment.department');
        if (!user) throw new NotFoundError('User not found');

        // Fetch all active leave types applicable to this user's department
        const activeLeaveTypes = await LeaveType.find({
            isActive: true,
            $or: [
                { applicableDepartments: 'all' },
                { applicableDepartments: user.employment?.department }
            ]
        });

        // Filter for Current Year Only
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

        // Fetch approved leaves for this user to calculate used days per type
        const approvedLeaves = await Leave.find({
            employeeId: targetUserId,
            status: 'approved',
            startDate: { $gte: startOfYear, $lte: endOfYear }
        });

        // Build a mapping from name and code to canonical identifier (Raw Name)
        const typeResolutionMap = {};
        activeLeaveTypes.forEach(lt => {
            const canonicalName = lt.name;
            typeResolutionMap[lt.name.toLowerCase()] = canonicalName;
            typeResolutionMap[lt.code.toLowerCase()] = canonicalName;
        });

        const usedMap = {};
        approvedLeaves.forEach(l => {
            const rawType = (l.leaveType || '').toLowerCase();
            const canonicalCode = typeResolutionMap[rawType] || rawType;
            usedMap[canonicalCode] = (usedMap[canonicalCode] || 0) + l.numberOfDays;
        });

        // Calculate detailed balances for each applicable type
        const balances = activeLeaveTypes.map(lt => {
            const canonicalName = lt.name;
            const used = usedMap[canonicalName] || 0;
            let totalAllocated = lt.defaultAmount ?? "";

            // For consistency: Available = Allocated - Used
            // This ignores manual balance adjustments in favor of a clean "Annual Allowance" view
            // If manual adjustment support is critically needed, we'd need a 'manualCorrection' field
            let currentBalance = 0;
            if (lt.isPaid && typeof totalAllocated === 'number') {
                currentBalance = Math.max(0, totalAllocated - used);
            } else {
                currentBalance = ""; // Unpaid or unlimited
                // If it's unpaid or unlimited, totalAllocated should also be blank string if not already
                if (!lt.isPaid) {
                    totalAllocated = "";
                }
            }

            return {
                leaveTypeId: lt._id,
                name: lt.name,
                code: lt.code,
                currentBalance: currentBalance,
                used: used,
                totalAllocated: totalAllocated,
                isPaid: lt.isPaid
            };
        });

        // Ensure 'unpaid' is handled if not explicitly in LeaveTypes
        // if (!balances.find(b => b.code.toUpperCase() === 'UNPAID')) {
        //     const usedUnpaid = usedMap['unpaid'] || 0;
        //     balances.push({
        //         name: 'Unpaid Leave',
        //         code: 'UNPAID',
        //         currentBalance: Infinity,
        //         used: usedUnpaid,
        //         totalAllocated: Infinity,
        //         isPaid: false
        //     });
        // }

        res.json({
            status: 'success',
            data: {
                userId: user._id,
                name: user.fullName,
                department: user.employment?.department,
                balances,
            },
        });
    },

    // Update Leave Status (Approve/Reject)
    updateLeaveStatus: async (req, res) => {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const approverId = req.user._id;

        const leave = await Leave.findById(id).populate('employeeId');
        if (!leave) throw new NotFoundError('Leave request not found');

        if (leave.status !== 'pending') {
            throw new BadRequestError(`Leave request is already ${leave.status}`);
        }

        // Permission Check: Only the reporting manager, Admin/HR, or user with canApproveLeave permission
        const requester = leave.employeeId;
        const reportingManagerId = requester.employment?.reportingManager;
        const currentApproverRole = (req.user.employment?.role || '').toLowerCase();

        const isReportingManager = reportingManagerId && reportingManagerId.toString() === approverId.toString();
        const isAdmin = currentApproverRole === 'admin' || currentApproverRole === 'hr' || currentApproverRole === 'super admin' || req.user.isAdmin;
        const hasApprovePermission = req.user.permissions?.canApproveLeave === true;

        if (!isReportingManager && !isAdmin && !hasApprovePermission) {
            throw new ForbiddenError('You do not have permission to approve/reject this leave request. Only the direct reporting manager, an administrator, or authorized personnel can perform this action.');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            leave.status = status;

            // Update approval flow
            leave.approvalFlow.push({
                approverId: approverId,
                approverRole: req.user.employment.role,
                action: status,
                actionDate: new Date(),
                comments: rejectionReason || `${status === 'approved' ? 'Approved' : 'Rejected'} by manager`,
            });

            if (status === 'approved') {
                // Dynamic balance logic: approving a leave record 
                // automatically makes it "used" in the next calculation.
            } else if (status === 'rejected') {
                leave.rejectionReason = rejectionReason;
            }

            // Save with session only if session is provided and valid
            if (session && session.id) {
                await leave.save({ session });
                await session.commitTransaction();
            } else {
                await leave.save();
                if (session && typeof session.commitTransaction === 'function') {
                    await session.commitTransaction();
                }
            }

            res.json({
                status: 'success',
                data: leave,
            });

        } catch (error) {
            if (session && typeof session.abortTransaction === 'function') {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            if (session && typeof session.endSession === 'function') {
                session.endSession();
            }
        }
    },

    // Cancel own leave request
    cancelMyLeave: async (req, res) => {
        const { id } = req.params;
        const { cancelReason } = req.body || {};
        const userId = req.user._id;

        const leave = await Leave.findById(id);

        if (!leave) {
            throw new NotFoundError('Leave request not found');
        }

        // Check ownership
        if (leave.employeeId.toString() !== userId.toString()) {
            throw new ForbiddenError('You can only cancel your own leave requests');
        }

        // Check status - only pending requests can be cancelled
        if (leave.status !== 'pending') {
            throw new BadRequestError(`Cannot cancel a leave request that is already ${leave.status}. Please refresh your page to see the latest status.`);
        }

        leave.status = 'cancelled';
        leave.cancelledAt = new Date();
        leave.cancelReason = cancelReason || 'Cancelled by employee';

        await leave.save();

        res.json({
            status: 'success',
            message: 'Leave request cancelled successfully',
            data: leave,
        });
    },

    // Get Leave Stats for Dashboard
    getLeaveStats: async (req, res) => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [pendingApprovals, approvedToday, rejectedTotal, totalRequests] = await Promise.all([
            Leave.countDocuments({ status: 'pending' }),
            Leave.countDocuments({ status: 'approved', updatedAt: { $gte: startOfToday } }),
            Leave.countDocuments({ status: 'rejected' }),
            Leave.countDocuments({}),
        ]);

        res.json({
            status: 'success',
            data: {
                pendingApprovals,
                approvedToday,
                rejectedTotal,
                totalRequests,
            },
        });
    },

    // Get my personal leave dashboard stats (for cards)
    getMyLeaveDashboardStats: async (req, res) => {
        const userId = req.user._id;

        const user = await User.findById(userId).select('leaveBalance employment.department');
        if (!user) throw new NotFoundError('User not found');

        // Fetch all active leave types applicable to this user's department
        const activeLeaveTypes = await LeaveType.find({
            isActive: true,
            $or: [
                { applicableDepartments: 'all' },
                { applicableDepartments: user.employment?.department }
            ]
        });

        // Filter for Current Year Only
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

        // Fetch all approved leaves for this user to calculate accurate 'used' counts
        const approvedLeaves = await Leave.find({
            employeeId: userId,
            status: 'approved',
            startDate: { $gte: startOfYear, $lte: endOfYear }
        });

        // Build a mapping from name and code to canonical name (Raw)
        const typeResolutionMap = {};
        activeLeaveTypes.forEach(lt => {
            const canonicalName = lt.name;
            typeResolutionMap[lt.name.toLowerCase()] = canonicalName;
            typeResolutionMap[lt.code.toLowerCase()] = canonicalName;
        });

        const usedMap = {};
        approvedLeaves.forEach(l => {
            const rawType = (l.leaveType || '').toLowerCase();
            const canonicalName = typeResolutionMap[rawType] || rawType;
            usedMap[canonicalName] = (usedMap[canonicalName] || 0) + l.numberOfDays;
        });

        // 1. Available & Per Type Stats
        let available = 0;
        let totalUsed = 0;
        let totalAllocatedSum = 0;

        const perType = activeLeaveTypes.map(lt => {
            const canonicalName = lt.name;
            const used = usedMap[canonicalName] || 0;
            const total = lt.defaultAmount;

            // Calculate balance as Total - Used
            let currentBal = 0;
            if (lt.isPaid && typeof total === 'number') {
                currentBal = Math.max(0, total - used);
                available += currentBal;
                totalUsed += used;
                totalAllocatedSum += total;
            } else {
                currentBal = Infinity;
            }

            return {
                name: lt.name,
                code: lt.code,
                balance: currentBal,
                used,
                total: total,
                isPaid: lt.isPaid
            };
        });

        // 3. Pending: Count of pending requests
        const pendingCount = await Leave.countDocuments({
            employeeId: userId,
            status: 'pending'
        });

        // 4. Total Allocated: Sum of all defaultAmount values for paid leave types
        const totalAllocated = totalAllocatedSum;

        res.json({
            status: 'success',
            data: {
                summary: {
                    available,
                    used: totalUsed,
                    pending: pendingCount,
                    totalAllocated
                },
                perType
            }
        });
    },

    // Update User Leave Balance (Admin/HR)
    updateUserLeaveBalance: async (req, res) => {
        const { userId } = req.params;
        const { leaveBalance } = req.body;

        if (!leaveBalance || typeof leaveBalance !== 'object') {
            throw new BadRequestError('leaveBalance object is required in body');
        }

        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        // Fetch active leave types to build a resolution map (Raw Name-based)
        const activeLeaveTypes = await LeaveType.find({ isActive: true });
        const typeResolutionMap = {};
        activeLeaveTypes.forEach(lt => {
            const canonicalName = lt.name;
            typeResolutionMap[lt.name.toLowerCase()] = canonicalName;
            typeResolutionMap[lt.code.toLowerCase()] = canonicalName;
        });

        const newBalances = leaveBalance.balances && Array.isArray(leaveBalance.balances)
            ? leaveBalance.balances.map(b => ({ type: b.name || b.code, value: b.currentBalance }))
            : Object.keys(leaveBalance).map(type => ({ type, value: leaveBalance[type] }));

        for (const item of newBalances) {
            if (typeof item.value === 'number') {
                const rawType = item.type.toLowerCase();
                const canonicalName = typeResolutionMap[rawType] || rawType;

                // Clear any existing keys that resolve to this same canonical name to prevent duplicates
                // e.g. if we are setting 'annual leave', remove 'al'
                if (user.leaveBalance) {
                    for (const existingKey of Array.from(user.leaveBalance.keys())) {
                        const existingCanonical = typeResolutionMap[existingKey.toLowerCase()] || existingKey.toLowerCase();
                        if (existingCanonical === canonicalName) {
                            user.leaveBalance.delete(existingKey);
                        }
                    }
                }

                user.leaveBalance.set(canonicalName, item.value);
            }
        }

        await user.save();

        res.json({
            status: 'success',
            data: Object.fromEntries(user.leaveBalance),
        });
    },
};

module.exports = leaveController;
