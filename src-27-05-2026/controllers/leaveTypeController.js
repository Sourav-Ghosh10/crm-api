const LeaveType = require('../models/LeaveType');
const Leave = require('../models/Leave');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const leaveTypeController = {
    createLeaveType: async (req, res) => {
        const { code } = req.body;
        const existing = await LeaveType.findOne({ code });
        if (existing) {
            throw new BadRequestError(`Leave type with code ${code} already exists`);
        }

        const leaveType = await LeaveType.create(req.body);
        res.status(201).json({
            status: 'success',
            data: leaveType,
        });
    },

    getAllLeaveTypesList: async (req, res) => {
        const { search, isActive } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        } else {
            // Default to active only if not specified? 
            // Current expectation allows seeing all if needed, but usually list is for active selection.
            // Let's default to { isActive: true } to maintain previous behavior, BUT allow override.
            // Actually, if filter is "not working", they probably want to see Inactive ones too.
            // Let's NOT default to true if they want full list, but usually dropdowns need active.
            // Let's respect the query param if present. If NOT present, default to true (common for lists).
            query.isActive = true;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }

        const leaveTypes = await LeaveType.find(query)
            .select('name code isPaid description defaultAmount maxCarryForward resetFrequency applicableDepartments applicableDesignations isActive')
            .sort({ name: 1 });

        res.json({
            status: 'success',
            data: leaveTypes,
        });
    },

    getAllLeaveTypes: async (req, res) => {
        const { page = 1, limit = 20, search, isActive } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        const userRole = req.user?.employment?.role;

        // 1. Strict Department/Designation Filtering
        const userDept = req.user?.employment?.department;
        const userDesignation = req.user?.employment?.designation;

        if (userDept) {
            query.applicableDepartments = { $in: ['all', userDept] };
        }
        if (userDesignation) {
            query.applicableDesignations = { $in: ['all', userDesignation] };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }

        // Fetch ALL matching leave types first (to handle dynamic filtering/injection correctly)
        // We'll apply pagination in memory after processing
        let leaveTypes = await LeaveType.find(query).sort({ createdAt: -1 });

        // 2. Dynamic Unpaid Leave Logic
        if (req.user) {
            // Calculate Total Paid Leave Balance for APPLICABLE types
            const applicablePaidTypes = await LeaveType.find({
                isPaid: true,
                isActive: true,
                applicableDepartments: { $in: ['all', userDept || ''] },
                applicableDesignations: { $in: ['all', userDesignation || ''] }
            }).select('name code defaultAmount');

            // Total Allocated
            const totalAllocated = applicablePaidTypes.reduce((sum, lt) => sum + (lt.defaultAmount || 0), 0);

            // Total Taken/Pending (from Leave table)
            const typeNames = applicablePaidTypes.map(lt => lt.name);
            const typeCodes = applicablePaidTypes.map(lt => lt.code);
            const allIdentifierPairs = [...typeNames, ...typeCodes];

            const takenLeaves = await Leave.find({
                employeeId: req.user._id,
                leaveType: { $in: allIdentifierPairs },
                status: { $in: ['pending', 'approved'] }
            });

            const totalTaken = takenLeaves.reduce((sum, l) => sum + (l.numberOfDays || 0), 0);
            const totalPaidBalance = totalAllocated - totalTaken;

            // console.log('Total Allocated:', totalAllocated, 'Total Taken/Pending:', totalTaken, 'Remaining:', totalPaidBalance);

            // Logic:
            // If Balance > 0 -> Hide Unpaid Leave
            // If Balance == 0 -> Ensure Unpaid Leave is visible (Inject if needed)

            const unpaidPattern = /unpaid|lwp|loss of pay/i;
            const isUnpaid = (lt) => lt.isPaid === false || (lt.code && ['LWP', 'UNPAID'].includes(lt.code.toUpperCase()));
            // console.log('Total Paid Balance:', totalPaidBalance);
            if (totalPaidBalance > 0) {
                // Hide Unpaid Leave
                leaveTypes = leaveTypes.filter(lt => !isUnpaid(lt));
            } else {
                // Balance is 0 (or less), User needs Unpaid Leave
                // Check if Unpaid Leave is already in the list
                const hasUnpaid = leaveTypes.some(lt => isUnpaid(lt));

                if (!hasUnpaid) {
                    // Fetch Unpaid Leave from DB
                    const unpaidLeaveType = await LeaveType.findOne({ code: 'LWP', isActive: true });
                    if (unpaidLeaveType) {
                        leaveTypes.push(unpaidLeaveType);
                    }
                }
            }

            // Special Case: If list is empty after strict filtering
            if (leaveTypes.length === 0) {
                const unpaidLeaveType = await LeaveType.findOne({ code: 'LWP', isActive: true });
                if (unpaidLeaveType) {
                    leaveTypes.push(unpaidLeaveType);
                }
            }
        }

        // Pagination (In-Memory)
        const total = leaveTypes.length;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedLeaveTypes = leaveTypes.slice(startIndex, startIndex + limitNum);

        res.json({
            status: 'success',
            data: paginatedLeaveTypes,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    },

    getLeaveTypeById: async (req, res) => {
        const leaveType = await LeaveType.findById(req.params.id);
        if (!leaveType) {
            throw new NotFoundError('Leave type not found');
        }
        res.json({
            status: 'success',
            data: leaveType,
        });
    },

    updateLeaveType: async (req, res) => {
        // Protect LWP from deactivation
        if (req.body.isActive === false) {
            const target = await LeaveType.findById(req.params.id);
            if (target && target.code === 'LWP') {
                throw new BadRequestError('Cannot deactivate default Unpaid Leave type');
            }
        }

        const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!leaveType) {
            throw new NotFoundError('Leave type not found');
        }

        res.json({
            status: 'success',
            data: leaveType,
        });
    },

    deleteLeaveType: async (req, res) => {
        const target = await LeaveType.findById(req.params.id);
        if (!target) {
            throw new NotFoundError('Leave type not found');
        }

        if (target.code === 'LWP') {
            throw new BadRequestError('Cannot delete system default Unpaid Leave type');
        }

        await LeaveType.findByIdAndDelete(req.params.id);

        res.json({
            status: 'success',
            message: 'Leave type deleted successfully',
        });
    },

    triggerManualBalanceReset: async (req, res) => {
        const { frequency } = req.body;
        if (!['monthly', 'yearly'].includes(frequency)) {
            throw new BadRequestError('Invalid frequency. Must be monthly or yearly.');
        }

        const leaveBalanceService = require('../services/leaveBalanceService');
        await leaveBalanceService.resetBalances(frequency);

        res.json({
            status: 'success',
            message: `${frequency} balance reset triggered successfully`,
        });
    },
};

module.exports = leaveTypeController;
