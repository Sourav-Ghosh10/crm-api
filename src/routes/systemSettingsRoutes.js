const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');
const { authenticate, authorize } = require('../middleware/auth');

// All settings routes below are protected and restricted to Admin
router.use(authenticate);
router.use(authorize('admin', 'super admin'));

router.route('/')
    .get(systemSettingsController.getSettings)
    .post(systemSettingsController.updateSetting);

router.route('/:key')
    .get(systemSettingsController.getSettingByKey);

module.exports = router;
