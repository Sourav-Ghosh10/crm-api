const LeavePolicy = require('../models/LeavePolicy');
const { NotFoundError } = require('../utils/errors');

const leavePolicyController = {
    createLeavePolicy: async (req, res) => {
        const policy = await LeavePolicy.create(req.body);
        const populatedPolicy = await policy.populate('leaveTypeId');

        res.status(201).json({
            status: 'success',
            data: populatedPolicy,
        });
    },

    getAllLeavePolicies: async (req, res) => {
        const { page = 1, limit = 20, search, isActive, leaveTypeId } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        if (leaveTypeId) {
            query.leaveTypeId = leaveTypeId;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const policies = await LeavePolicy.find(query)
            .populate('leaveTypeId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await LeavePolicy.countDocuments(query);

        res.json({
            status: 'success',
            data: policies,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    },

    getLeavePolicyById: async (req, res) => {
        const policy = await LeavePolicy.findById(req.params.id).populate('leaveTypeId');
        if (!policy) {
            throw new NotFoundError('Leave policy not found');
        }
        res.json({
            status: 'success',
            data: policy,
        });
    },

    updateLeavePolicy: async (req, res) => {
        const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('leaveTypeId');

        if (!policy) {
            throw new NotFoundError('Leave policy not found');
        }

        res.json({
            status: 'success',
            data: policy,
        });
    },

    deleteLeavePolicy: async (req, res) => {
        const policy = await LeavePolicy.findByIdAndDelete(req.params.id);
        if (!policy) {
            throw new NotFoundError('Leave policy not found');
        }
        res.json({
            status: 'success',
            message: 'Leave policy deleted successfully',
        });
    },
};

module.exports = leavePolicyController;
