const Role = require('../models/Role');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const roleService = {
    getRoles: async ({ page, limit, filters }) => {
        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.search) {
            query.$or = [
                { name: new RegExp(filters.search, 'i') },
                { description: new RegExp(filters.search, 'i') }
            ];
        }

        const [roles, total] = await Promise.all([
            Role.find(query)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Role.countDocuments(query),
        ]);

        return { roles, total };
    },

    getRoleById: async (id) => {
        const role = await Role.findById(id).lean();
        if (!role) {
            throw new NotFoundError('Role not found');
        }
        return role;
    },

    createRole: async (data) => {
        const existing = await Role.findOne({ name: data.name });
        if (existing) {
            throw new ConflictError('Role with this name already exists');
        }

        const role = await Role.create(data);
        logger.info(`Role created: ${role.name}`);
        return role;
    },

    updateRole: async (id, data) => {
        const role = await Role.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!role) {
            throw new NotFoundError('Role not found');
        }

        logger.info(`Role updated: ${role.name}`);
        return role;
    },

    deleteRole: async (id) => {
        const role = await Role.findByIdAndDelete(id);
        if (!role) {
            throw new NotFoundError('Role not found');
        }
        logger.info(`Role deleted: ${role.name}`);
        return role;
    }
};

module.exports = roleService;
