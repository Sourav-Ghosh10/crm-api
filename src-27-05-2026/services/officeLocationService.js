const OfficeLocation = require('../models/OfficeLocation');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const officeLocationService = {
    /**
     * Get all office locations with pagination and filters
     */
    getOfficeLocations: async ({ page, limit, filters }) => {
        const query = {};
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.search) {
            query.name = new RegExp(filters.search, 'i');
        }

        const [locations, total] = await Promise.all([
            OfficeLocation.find(query)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            OfficeLocation.countDocuments(query),
        ]);

        return { locations, total };
    },

    /**
     * Get office location by ID
     */
    getOfficeLocationById: async (id) => {
        const location = await OfficeLocation.findById(id).lean();
        if (!location) {
            throw new NotFoundError('Office location not found');
        }
        return location;
    },

    /**
     * Create a new office location
     */
    createOfficeLocation: async (data) => {
        const existing = await OfficeLocation.findOne({ name: data.name });
        if (existing) {
            throw new ConflictError('Office location with this name already exists');
        }

        // If this is set as headquarters, unset any existing headquarters
        if (data.isHeadquarters) {
            await OfficeLocation.updateMany({ isHeadquarters: true }, { isHeadquarters: false });
        }

        const location = await OfficeLocation.create(data);
        logger.info(`Office location created: ${location.name}`);
        return location;
    },

    /**
     * Update office location
     */
    updateOfficeLocation: async (id, data) => {
        // If this is set as headquarters, unset any existing headquarters
        if (data.isHeadquarters) {
            await OfficeLocation.updateMany({ _id: { $ne: id }, isHeadquarters: true }, { isHeadquarters: false });
        }

        const location = await OfficeLocation.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!location) {
            throw new NotFoundError('Office location not found');
        }

        logger.info(`Office location updated: ${location.name}`);
        return location;
    },

    /**
     * Toggle office location status
     */
    toggleStatus: async (id, isActive) => {
        const location = await OfficeLocation.findByIdAndUpdate(
            id,
            { isActive, updatedAt: new Date() },
            { new: true }
        );

        if (!location) {
            throw new NotFoundError('Office location not found');
        }

        logger.info(`Office location status toggled: ${location.name} to ${isActive}`);
        return location;
    },

    /**
     * Delete office location
     */
    deleteOfficeLocation: async (id) => {
        const location = await OfficeLocation.findByIdAndDelete(id);
        if (!location) {
            throw new NotFoundError('Office location not found');
        }
        logger.info(`Office location deleted: ${location.name}`);
        return location;
    },
};

module.exports = officeLocationService;
