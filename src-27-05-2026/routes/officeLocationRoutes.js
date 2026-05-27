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
 *   post:
 *     summary: Create a new office location
 *     tags: [OfficeLocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *   put:
 *     summary: Update office location
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
