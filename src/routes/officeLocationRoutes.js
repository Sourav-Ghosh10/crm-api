const express = require('express');
const officeLocationController = require('../controllers/officeLocationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
    createOfficeLocationSchema,
    updateOfficeLocationSchema,
    toggleStatusSchema,
} = require('../validators/officeLocationValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: OfficeLocations
 *   description: Office location management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OfficeLocation:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Mumbai Technopark"
 *         address:
 *           type: object
 *           required:
 *             - street
 *             - city
 *             - state
 *             - country
 *             - zipCode
 *           properties:
 *             street:
 *               type: string
 *               example: "123 Tech Lane"
 *             city:
 *               type: string
 *               example: "Mumbai"
 *             state:
 *               type: string
 *               example: "Maharashtra"
 *             country:
 *               type: string
 *               example: "India"
 *             zipCode:
 *               type: string
 *               example: "400001"
 *         contactInfo:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *               example: "+91 9876543210"
 *             email:
 *               type: string
 *               example: "mumbai@pulseops.com"
 *         coordinates:
 *           type: object
 *           description: GPS coordinates of office center for geofencing
 *           properties:
 *             latitude:
 *               type: number
 *               example: 19.0760
 *             longitude:
 *               type: number
 *               example: 72.8777
 *         radius:
 *           type: number
 *           description: Geofence radius in meters
 *           default: 100
 *           example: 100
 *         geofencingEnabled:
 *           type: boolean
 *           description: Whether geofence restriction is enabled for attendance
 *           default: true
 *         timezone:
 *           type: string
 *           default: "Asia/Kolkata"
 *           example: "Asia/Kolkata"
 *         isHeadquarters:
 *           type: boolean
 *           default: false
 *         isActive:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/office-locations:
 *   get:
 *     summary: Get all office locations
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of office locations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OfficeLocation'
 *   post:
 *     summary: Create a new office location
 *     description: Creates an office location with optional GPS coordinates, radius in meters, and geofencing settings.
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OfficeLocation'
 *     responses:
 *       201:
 *         description: Office location created
 */
router.get('/', officeLocationController.getOfficeLocations);
router.post('/', validate(createOfficeLocationSchema), officeLocationController.createOfficeLocation);

/**
 * @swagger
 * /api/office-locations/{id}:
 *   get:
 *     summary: Get office location by ID
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Office location details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/OfficeLocation'
 *   put:
 *     summary: Update office location
 *     description: Update office location details, geofence radius, and coordinates.
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OfficeLocation'
 *     responses:
 *       200:
 *         description: Office location updated
 *   delete:
 *     summary: Delete office location
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Office location deleted
 */
router.get('/:id', validate(idParamSchema, 'params'), officeLocationController.getOfficeLocationById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateOfficeLocationSchema), officeLocationController.updateOfficeLocation);
router.delete('/:id', validate(idParamSchema, 'params'), officeLocationController.deleteOfficeLocation);

/**
 * @swagger
 * /api/office-locations/{id}/status:
 *   patch:
 *     summary: Toggle office location status
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(toggleStatusSchema), officeLocationController.toggleStatus);

module.exports = router;
