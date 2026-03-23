const express = require('express');
const leaveTypeController = require('../controllers/leaveTypeController');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { validate } = require('../middleware/validate');
const {
    createLeaveTypeSchema,
    updateLeaveTypeSchema,
    leaveTypeQuerySchema,
} = require('../validators/leaveSettingsValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leave Settings
 *   description: Management of Leave Types and Policies
 */

/**
 * @swagger
 * /api/leave-types:
 *   get:
 *     summary: Get all leave types
 *     tags: [Leave Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of leave types
 *   post:
 *     summary: Create a new leave type
 *     tags: [Leave Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               isPaid:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router
    .route('/list')
    .get(catchAsync(leaveTypeController.getAllLeaveTypesList));

router
    .route('/')
    .get(validate(leaveTypeQuerySchema, 'query'), catchAsync(leaveTypeController.getAllLeaveTypes))
    .post(validate(createLeaveTypeSchema), catchAsync(leaveTypeController.createLeaveType));

/**
 * @swagger
 * /api/leave-types/{id}:
 *   get:
 *     summary: Get a leave type by ID
 *     tags: [Leave Settings]
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
 *         description: Leave type details
 *   put:
 *     summary: Update a leave type
 *     tags: [Leave Settings]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPaid:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete a leave type
 *     tags: [Leave Settings]
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
 *         description: Deleted
 */
router
    .route('/:id')
    .get(validate(idParamSchema, 'params'), catchAsync(leaveTypeController.getLeaveTypeById))
    .put(validate(idParamSchema, 'params'), validate(updateLeaveTypeSchema), catchAsync(leaveTypeController.updateLeaveType))
    .delete(validate(idParamSchema, 'params'), catchAsync(leaveTypeController.deleteLeaveType));

/**
 * @swagger
 * /api/leave-types/reset-balances:
 *   post:
 *     summary: Manually trigger balance reset
 *     tags: [Leave Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balances reset successfully
 */
router
    .route('/reset-balances')
    .post(catchAsync(leaveTypeController.triggerManualBalanceReset));

module.exports = router;
