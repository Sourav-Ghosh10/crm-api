const moment = require('moment');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Reimbursement = require('../models/Reimbursement');
const User = require('../models/User');

const activityService = {
    getRecentActivity: async (userId, selectedDate) => {
        const startOfDay = moment.utc(selectedDate).startOf('day').toDate();
        const endOfDay = moment.utc(selectedDate).endOf('day').toDate();

        const [attendance, leaves, reimbursements] = await Promise.all([
            Attendance.findOne({ employeeId: userId, date: startOfDay }).lean(),
            Leave.find({
                employeeId: userId,
                status: { $ne: 'cancelled' },
                $or: [
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { 'approvalFlow.actionDate': { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).populate('approvalFlow.approverId', 'personalInfo.firstName personalInfo.lastName').lean(),
            Reimbursement.find({
                employeeId: userId,
                isActive: true,
                $or: [
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { 'approval.approvedAt': { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).populate('approval.approvedBy', 'personalInfo.firstName personalInfo.lastName').lean()
        ]);

        const activities = [];

        // 1. Process Attendance
        if (attendance) {
            // Clock In
            if (attendance.checkIn && attendance.checkIn.time) {
                activities.push({
                    type: 'CLOCK_IN',
                    timestamp: attendance.checkIn.time,
                    title: 'Clocked In',
                    description: `Clocked in at ${moment(attendance.checkIn.time).format('hh:mm A')}`,
                    metadata: {
                        deviceInfo: attendance.checkIn.deviceInfo,
                        ipAddress: attendance.checkIn.ipAddress
                    }
                });
            }

            // Sessions
            if (attendance.sessions) {
                attendance.sessions.forEach((session, index) => {
                    // Skip the first check-in as it's already handled by top-level checkIn? 
                    // Actually, let's just use sessions for precision if there are multiple.
                    // But requirement says if missing logout, still show clock-in.
                    if (index > 0 && session.checkIn && session.checkIn.time) {
                        activities.push({
                            type: 'CLOCK_IN',
                            timestamp: session.checkIn.time,
                            title: 'Clocked In (Session)',
                            description: `Logged back in at ${moment(session.checkIn.time).format('hh:mm A')}`
                        });
                    }
                    if (session.checkOut && session.checkOut.time) {
                        activities.push({
                            type: 'CLOCK_OUT',
                            timestamp: session.checkOut.time,
                            title: 'Clocked Out',
                            description: `Clocked out at ${moment(session.checkOut.time).format('hh:mm A')}`
                        });
                    }
                });
            }

            // Breaks
            if (attendance.breaks) {
                attendance.breaks.forEach(brk => {
                    if (brk.startTime) {
                        activities.push({
                            type: 'BREAK_START',
                            timestamp: brk.startTime,
                            title: 'Break Started',
                            description: `Started break at ${moment(brk.startTime).format('hh:mm A')}`
                        });
                    }
                    if (brk.endTime) {
                        activities.push({
                            type: 'BREAK_END',
                            timestamp: brk.endTime,
                            title: 'Break Ended',
                            description: `Resumed work at ${moment(brk.endTime).format('hh:mm A')}`,
                            metadata: {
                                duration: brk.durationString
                            }
                        });
                    }
                });
            }
        }

        // 2. Process Leaves
        leaves.forEach(leave => {
            // Applied
            if (moment(leave.createdAt).isBetween(startOfDay, endOfDay, null, '[]')) {
                activities.push({
                    type: 'LEAVE_APPLIED',
                    timestamp: leave.createdAt,
                    title: 'Leave Applied',
                    description: `${leave.leaveType} applied for ${moment(leave.startDate).format('MMM DD')} - ${moment(leave.endDate).format('MMM DD')}`,
                    referenceId: leave._id,
                    metadata: {
                        leaveType: leave.leaveType,
                        reason: leave.reason,
                        days: leave.numberOfDays
                    }
                });
            }

            // Decisions
            if (leave.approvalFlow) {
                leave.approvalFlow.forEach(flow => {
                    if (moment(flow.actionDate).isBetween(startOfDay, endOfDay, null, '[]')) {
                        const type = flow.action === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';
                        const approverName = flow.approverId ? `${flow.approverId.personalInfo.firstName} ${flow.approverId.personalInfo.lastName}` : 'System';
                        activities.push({
                            type,
                            timestamp: flow.actionDate,
                            title: flow.action === 'approved' ? 'Leave Approved' : 'Leave Rejected',
                            description: `Leave request ${flow.action} by ${approverName}`,
                            referenceId: leave._id,
                            metadata: {
                                leaveType: leave.leaveType,
                                approvedBy: approverName,
                                comments: flow.comments
                            }
                        });
                    }
                });
            }
        });

        // 3. Process Reimbursements
        reimbursements.forEach(rem => {
            // Applied
            if (moment(rem.createdAt).isBetween(startOfDay, endOfDay, null, '[]')) {
                activities.push({
                    type: 'REIMBURSEMENT_APPLIED',
                    timestamp: rem.createdAt,
                    title: 'Reimbursement Applied',
                    description: `Applied for ${rem.reimbursementType}: ${rem.title}`,
                    referenceId: rem._id,
                    metadata: {
                        amount: rem.amount,
                        type: rem.reimbursementType
                    }
                });
            }

            // Approved/Rejected
            if (rem.approval && rem.approval.approvedAt && moment(rem.approval.approvedAt).isBetween(startOfDay, endOfDay, null, '[]')) {
                const isApproved = rem.status === 'approved';
                const type = isApproved ? 'REIMBURSEMENT_APPROVED' : 'REIMBURSEMENT_REJECTED';
                const approverName = rem.approval.approvedBy ? `${rem.approval.approvedBy.personalInfo.firstName} ${rem.approval.approvedBy.personalInfo.lastName}` : 'System';
                activities.push({
                    type,
                    timestamp: rem.approval.approvedAt,
                    title: isApproved ? 'Reimbursement Approved' : 'Reimbursement Rejected',
                    description: `Reimbursement ${rem.status} by ${approverName}`,
                    referenceId: rem._id,
                    metadata: {
                        amount: rem.amount,
                        approvedBy: approverName,
                        remarks: rem.approval.remarks
                    }
                });
            }
        });

        // Final Sort by Timestamp Ascending
        activities.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
            date: moment(selectedDate).format('YYYY-MM-DD'),
            employeeId: userId,
            activities
        };
    }
};

module.exports = activityService;
