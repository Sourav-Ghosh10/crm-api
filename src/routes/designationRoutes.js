const express = require('express');
const designationController = require('../controllers/designationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
    createDesignationSchema,
    updateDesignationSchema,
    toggleStatusSchema
} = require('../validators/designationValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Designations
 *   description: Designation management
 */

/**
 * @swagger
 * /api/designations:
 *   get:
 *     summary: Get all designations
 *     tags: [Designations]
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
 *         description: List of designations
 *   post:
 *     summary: Create a new designation
 *     tags: [Designations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Designation created
 */
router.get('/', designationController.getDesignations);
router.post('/', validate(createDesignationSchema), designationController.createDesignation);

/**
 * @swagger
 * /api/designations/{id}:
 *   get:
 *     summary: Get designation by ID
 *     tags: [Designations]
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
 *         description: Designation details
 *   put:
 *     summary: Update designation
 *     tags: [Designations]
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
 *         description: Designation updated
 *   delete:
 *     summary: Delete designation
 *     tags: [Designations]
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
 *         description: Designation deleted
 */
router.get('/:id', validate(idParamSchema, 'params'), designationController.getDesignationById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateDesignationSchema), designationController.updateDesignation);
router.delete('/:id', validate(idParamSchema, 'params'), designationController.deleteDesignation);

/**
 * @swagger
 * /api/designations/{id}/status:
 *   patch:
 *     summary: Toggle designation status
 *     tags: [Designations]
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
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(toggleStatusSchema), designationController.toggleStatus);

module.exports = router;
