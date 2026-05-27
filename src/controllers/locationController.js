const LocationHistory = require('../models/LocationHistory');
const User = require('../models/User');
const { reverseGeocode } = require('../utils/geocoder');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

const locationController = {
    trackLocation: async (req, res, next) => {
        try {
            const { latitude, longitude, type } = req.body;
            const userId = req.user.id;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || 'Unknown';

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required'
                });
            }

            // Run reverse geocoding to resolve exact physical address
            const address = await reverseGeocode(latitude, longitude);

            const record = await LocationHistory.create({
                userId,
                latitude,
                longitude,
                address,
                ipAddress,
                userAgent,
                type: type || 'tracking',
                loginAt: new Date()
            });

            // Update user's last active location
            await User.findByIdAndUpdate(userId, {
                lastActiveLocation: {
                    latitude,
                    longitude,
                    address,
                    updatedAt: new Date()
                }
            });

            res.status(201).json({
                success: true,
                message: 'Location tracked successfully',
                data: record
            });
        } catch (error) {
            next(error);
        }
    },

    getLocationHistory: async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { date, page = 1, limit = 100 } = req.query;

            const filter = { userId };

            if (date) {
                const tzUser = await User.findById(userId).select('employment.timezone').lean();
                const timezone = tzUser?.employment?.timezone || 'Asia/Kolkata';

                const startOfDay = moment.tz(date, timezone).startOf('day').toDate();
                const endOfDay = moment.tz(date, timezone).endOf('day').toDate();

                filter.loginAt = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [records, total] = await Promise.all([
                LocationHistory.find(filter)
                    .sort({ loginAt: 1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                LocationHistory.countDocuments(filter)
            ]);

            res.status(200).json({
                success: true,
                data: records,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit))
            });
        } catch (error) {
            next(error);
        }
    },

    getLastActiveLocations: async (req, res, next) => {
        try {
            // Find users who are active and have a last active location updated recently
            const users = await User.find({
                isActive: true,
                'lastActiveLocation.latitude': { $exists: true }
            })
            .select('username personalInfo.firstName personalInfo.lastName employment.department employment.designation lastActiveLocation')
            .lean();

            // Enrich users with standard full name field
            const enriched = users.map(user => {
                user.fullName = `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim();
                return user;
            });

            res.status(200).json({
                success: true,
                data: enriched
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = locationController;
