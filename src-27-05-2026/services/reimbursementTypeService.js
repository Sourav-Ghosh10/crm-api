const ReimbursementType = require('../models/ReimbursementType');
const AuditLog = require('../models/AuditLog');
const cacheService = require('./cacheService');
const { NotFoundError, ConflictError } = require('../utils/errors');

const CACHE_KEY_ACTIVE_TYPES = 'reimbursement_types:active';

const reimbursementTypeService = {
    createType: async (data, userId) => {
        const existing = await ReimbursementType.findOne({ name: data.name });
        if (existing) {
            throw new ConflictError(`Reimbursement type '${data.name}' already exists`);
        }

        const type = await ReimbursementType.create({
            ...data,
            createdBy: userId,
        });

        // Invalidate Cache
        await cacheService.del(CACHE_KEY_ACTIVE_TYPES);

        // Audit Log
        await AuditLog.create({
            userId,
            action: 'CREATE',
            entityType: 'reimbursementType',
            entityId: type._id,
            description: `Created reimbursement type: ${type.name}`,
            after: type.toObject(),
        });

        return type;
    },

    getAllTypes: async ({ page = 1, limit = 20, filters = {} }) => {
        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.search) {
            query.name = new RegExp(filters.search, 'i');
        }

        const [types, total] = await Promise.all([
            ReimbursementType.find(query)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ReimbursementType.countDocuments(query),
        ]);

        return { types, total };
    },

    getActiveTypes: async () => {
        const cached = await cacheService.get(CACHE_KEY_ACTIVE_TYPES);
        if (cached) return cached;

        const types = await ReimbursementType.find({ isActive: true })
            .select('name description maxAmount requiresReceipt')
            .sort({ name: 1 })
            .lean();

        await cacheService.set(CACHE_KEY_ACTIVE_TYPES, types, 3600); // Cache for 1 hour
        return types;
    },

    updateType: async (id, data, userId) => {
        const type = await ReimbursementType.findById(id);
        if (!type) {
            throw new NotFoundError('Reimbursement type not found');
        }

        if (data.name && data.name !== type.name) {
            const existing = await ReimbursementType.findOne({ name: data.name });
            if (existing) {
                throw new ConflictError(`Reimbursement type '${data.name}' already exists`);
            }
        }

        const before = type.toObject();
        Object.assign(type, data);
        await type.save();

        // Invalidate Cache
        await cacheService.del(CACHE_KEY_ACTIVE_TYPES);

        // Audit Log
        await AuditLog.create({
            userId,
            action: 'UPDATE',
            entityType: 'reimbursementType',
            entityId: type._id,
            description: `Updated reimbursement type: ${type.name}`,
            changes: {
                before,
                after: type.toObject(),
            },
        });

        return type;
    },

    toggleStatus: async (id, isActive, userId) => {
        const type = await ReimbursementType.findById(id);
        if (!type) {
            throw new NotFoundError('Reimbursement type not found');
        }

        const before = type.toObject();
        type.isActive = isActive;
        await type.save();

        // Invalidate Cache
        await cacheService.del(CACHE_KEY_ACTIVE_TYPES);

        // Audit Log
        await AuditLog.create({
            userId,
            action: 'UPDATE',
            entityType: 'reimbursementType',
            entityId: type._id,
            description: `${isActive ? 'Activated' : 'Deactivated'} reimbursement type: ${type.name}`,
            changes: {
                before,
                after: type.toObject(),
            },
        });

        return type;
    },
};

module.exports = reimbursementTypeService;
