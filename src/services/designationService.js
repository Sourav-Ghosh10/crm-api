const Designation = require('../models/Designation');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const designationService = {
    getDesignations: async ({ page, limit, filters }) => {
        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.search) {
            query.title = new RegExp(filters.search, 'i');
        }

        const [designations, total] = await Promise.all([
            Designation.find(query)
                .sort({ title: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Designation.countDocuments(query),
        ]);

        return { designations, total };
    },

    getDesignationById: async (id) => {
        const designation = await Designation.findById(id).lean();
        if (!designation) {
            throw new NotFoundError('Designation not found');
        }
        return designation;
    },

    createDesignation: async (data) => {
        const existing = await Designation.findOne({ title: data.title });
        if (existing) {
            throw new ConflictError('Designation with this title already exists');
        }

        const designation = await Designation.create(data);
        logger.info(`Designation created: ${designation.title}`);
        return designation;
    },

    updateDesignation: async (id, data) => {
        const designation = await Designation.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!designation) {
            throw new NotFoundError('Designation not found');
        }

        logger.info(`Designation updated: ${designation.title}`);
        return designation;
    },

    toggleStatus: async (id, isActive) => {
        const designation = await Designation.findByIdAndUpdate(
            id,
            { isActive, updatedAt: new Date() },
            { new: true }
        );

        if (!designation) {
            throw new NotFoundError('Designation not found');
        }

        logger.info(`Designation status toggled: ${designation.title} to ${isActive}`);
        return designation;
    },

    deleteDesignation: async (id) => {
        const designation = await Designation.findByIdAndDelete(id);
        if (!designation) {
            throw new NotFoundError('Designation not found');
        }
        logger.info(`Designation deleted: ${designation.title}`);
        return designation;
    }
};

module.exports = designationService;
