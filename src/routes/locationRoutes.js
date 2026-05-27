const express = require('express');
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Protect all routes
router.use(authenticate);

router.post('/track', catchAsync(locationController.trackLocation));
router.get('/history/:userId', catchAsync(locationController.getLocationHistory));
router.get('/last-active', catchAsync(locationController.getLastActiveLocations));

module.exports = router;
