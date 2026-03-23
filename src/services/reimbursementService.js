const Reimbursement = require('../models/Reimbursement');
const User = require('../models/User');
const ReimbursementType = require('../models/ReimbursementType');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { REIMBURSEMENT_STATUS } = require('../config/constants');

const reimbursementService = {
    createRequest: async (employeeId, data) => {
        // Validate Reimbursement Type
        console.log(data)
        const type = await ReimbursementType.findById(data.reimbursementTypeId);
        if (!type) throw new NotFoundError('Reimbursement type not found');
        if (!type.isActive) throw new BadRequestError('This reimbursement type is currently disabled');

        // Check Max Amount
        if (type.maxAmount && data.amount > type.maxAmount) {
            throw new BadRequestError(`Exceeds maximum allowable amount (${type.maxAmount}) for ${type.name}`);
        }

        // Check Receipt Requirement
        if (type.requiresReceipt && (!data.attachments || data.attachments.length === 0)) {
            throw new BadRequestError(`Receipt is mandatory for ${type.name}`);
        }

        const request = await Reimbursement.create({
            employeeId,
            ...data,
            reimbursementType: type.name, // Snapshot name for historical consistency
        });
        return request;
    },

    updateRequest: async (id, employeeId, data) => {
        const request = await Reimbursement.findOne({ _id: id, employeeId, isActive: true });
        if (!request) throw new NotFoundError('Reimbursement request not found');

        if (request.status !== REIMBURSEMENT_STATUS.PENDING) {
            throw new BadRequestError(`Cannot edit a ${request.status} request. Only pending requests can be edited.`);
        }

        // If type is changing, re-validate
        if (data.reimbursementTypeId && data.reimbursementTypeId.toString() !== request.reimbursementTypeId.toString()) {
            const type = await ReimbursementType.findById(data.reimbursementTypeId);
            if (!type) throw new NotFoundError('Reimbursement type not found');
            if (!type.isActive) throw new BadRequestError('This reimbursement type is currently disabled');

            data.reimbursementType = type.name;

            // Re-check Max Amount
            const amountToCheck = data.amount || request.amount;
            if (type.maxAmount && amountToCheck > type.maxAmount) {
                throw new BadRequestError(`Exceeds maximum allowable amount (${type.maxAmount}) for ${type.name}`);
            }

            // Re-check Receipt Requirement
            const attachmentsToCheck = data.attachments || request.attachments;
            if (type.requiresReceipt && (!attachmentsToCheck || attachmentsToCheck.length === 0)) {
                throw new BadRequestError(`Receipt is mandatory for ${type.name}`);
            }
        } else if (data.amount && data.amount !== request.amount) {
            // Amount changed, re-validate against current type
            const type = await ReimbursementType.findById(request.reimbursementTypeId);
            if (type && type.maxAmount && data.amount > type.maxAmount) {
                throw new BadRequestError(`Exceeds maximum allowable amount (${type.maxAmount}) for ${type.name}`);
            }
        }

        // Apply updates
        Object.assign(request, data);
        await request.save();
        return request;
    },

    getRequests: async ({ page = 1, limit = 20, filters = {} }) => {
        const query = { isActive: true };

        if (filters.search) {
            const userFilter = {
                $or: [
                    { 'personalInfo.firstName': { $regex: filters.search, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: filters.search, $options: 'i' } },
                    { 'personalInfo.email': { $regex: filters.search, $options: 'i' } },
                    { employeeId: { $regex: filters.search, $options: 'i' } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                                regex: filters.search,
                                options: 'i',
                            },
                        },
                    },
                ],
            };
            const matchingUsers = await User.find(userFilter).select('_id').lean();
            const userIds = matchingUsers.map((u) => u._id);

            if (filters.employeeId) {
                if (userIds.some((id) => id.toString() === filters.employeeId.toString())) {
                    query.employeeId = filters.employeeId;
                } else {
                    return { requests: [], total: 0 };
                }
            } else {
                query.employeeId = { $in: userIds };
            }
        } else if (filters.employeeId) {
            query.employeeId = filters.employeeId;
        }

        if (filters.status) query.status = filters.status;
        if (filters.reimbursementType) query.reimbursementType = filters.reimbursementType;
        if (filters.startDate || filters.endDate) {
            query.expenseDate = {};
            if (filters.startDate) query.expenseDate.$gte = new Date(filters.startDate);
            if (filters.endDate) query.expenseDate.$lte = new Date(filters.endDate);
        }

        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            Reimbursement.find(query)
                .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
                .populate('approval.approvedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Reimbursement.countDocuments(query),
        ]);

        return { requests, total };
    },

    getRequestById: async (id) => {
        const request = await Reimbursement.findOne({ _id: id, isActive: true })
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName personalInfo.email employeeId')
            .populate('approval.approvedBy', 'personalInfo.firstName personalInfo.lastName');

        if (!request) throw new NotFoundError('Reimbursement request not found');
        return request;
    },

    updateStatus: async (id, approvedBy, { status, remarks, rejectionReason }) => {
        const request = await Reimbursement.findOne({ _id: id, isActive: true });
        if (!request) throw new NotFoundError('Reimbursement request not found');

        if (request.status !== REIMBURSEMENT_STATUS.PENDING) {
            throw new BadRequestError(`Cannot update status of a ${request.status} request`);
        }

        request.status = status;
        request.approval = {
            approvedBy,
            approvedAt: new Date(),
            remarks,
            rejectionReason,
        };

        await request.save();
        return request;
    },

    markAsPaid: async (id, paymentData) => {
        const request = await Reimbursement.findOne({ _id: id, isActive: true });
        if (!request) throw new NotFoundError('Reimbursement request not found');

        if (request.status !== REIMBURSEMENT_STATUS.APPROVED) {
            throw new BadRequestError('Only approved requests can be marked as paid');
        }

        request.status = REIMBURSEMENT_STATUS.PAID;
        request.payment = {
            ...paymentData,
            paidAt: paymentData.paidAt || new Date(),
        };

        await request.save();
        return request;
    },

    deleteRequest: async (id) => {
        const request = await Reimbursement.findOne({ _id: id, isActive: true });
        if (!request) throw new NotFoundError('Reimbursement request not found');

        if (request.status !== REIMBURSEMENT_STATUS.PENDING) {
            throw new BadRequestError('Only pending requests can be deleted');
        }

        request.isActive = false;
        await request.save();
        return true;
    },
};

module.exports = reimbursementService;
