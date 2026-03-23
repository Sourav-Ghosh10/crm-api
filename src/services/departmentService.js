const Department = require('../models/Department');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const departmentService = {
    getDepartments: async ({ page, limit, filters }) => {
        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.search) {
            query.name = new RegExp(filters.search, 'i');
        }

        const [departments, total] = await Promise.all([
            Department.find(query)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('employeeCount')
                .lean(),
            Department.countDocuments(query),
        ]);

        return { departments, total };
    },

    getDepartmentById: async (id) => {
        const department = await Department.findById(id).populate('employeeCount').lean();
        if (!department) {
            throw new NotFoundError('Department not found');
        }
        return department;
    },

    createDepartment: async (data) => {
        const existing = await Department.findOne({ name: data.name });
        if (existing) {
            throw new ConflictError('Department with this name already exists');
        }

        const department = await Department.create(data);
        logger.info(`Department created: ${department.name}`);
        return department;
    },

    updateDepartment: async (id, data) => {
        const department = await Department.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!department) {
            throw new NotFoundError('Department not found');
        }

        logger.info(`Department updated: ${department.name}`);
        return department;
    },

    toggleStatus: async (id, isActive) => {
        const department = await Department.findByIdAndUpdate(
            id,
            { isActive, updatedAt: new Date() },
            { new: true }
        );

        if (!department) {
            throw new NotFoundError('Department not found');
        }

        logger.info(`Department status toggled: ${department.name} to ${isActive}`);
        return department;
    },

    deleteDepartment: async (id) => {
        const department = await Department.findByIdAndDelete(id);
        if (!department) {
            throw new NotFoundError('Department not found');
        }
        logger.info(`Department deleted: ${department.name}`);
        return department;
    }
};

module.exports = departmentService;
