const SystemSettings = require('../models/SystemSettings');
const { NotFoundError } = require('../utils/errors');
const catchAsync = require('../utils/catchAsync');

const systemSettingsController = {
    // Get all settings
    getSettings: catchAsync(async (req, res) => {
        const settings = await SystemSettings.find();
        res.json({
            status: 'success',
            data: settings
        });
    }),

    // Get setting by key
    getSettingByKey: catchAsync(async (req, res) => {
        const { key } = req.params;
        const setting = await SystemSettings.findOne({ key });
        if (!setting) throw new NotFoundError('Setting not found');
        
        res.json({
            status: 'success',
            data: setting
        });
    }),

    // Upsert setting
    updateSetting: catchAsync(async (req, res) => {
        const { key, value, description } = req.body;
        
        const setting = await SystemSettings.findOneAndUpdate(
            { key },
            { value, description },
            { new: true, upsert: true }
        );

        res.json({
            status: 'success',
            data: setting
        });
    })
};

module.exports = systemSettingsController;
