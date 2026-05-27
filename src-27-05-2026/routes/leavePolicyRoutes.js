const express = require('express');
const leavePolicyController = require('../controllers/leavePolicyController');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { validate } = require('../middleware/validate');
const {
    createLeavePolicySchema,
    updateLeavePolicySchema,
    leavePolicyQuerySchema,
} = require('../validators/leaveSettingsValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/leave-policies:
 *   get:
 *     summary: Get all leave policies
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
 *       - in: query
 *         name: leaveTypeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of leave policies
 *   post:
 *     summary: Create a new leave policy
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
 *               - leaveTypeId
 *               - name
 *               - defaultAmount
 *             properties:
 *               leaveTypeId:
 *                 type: string
 *                 description: ObjectId of the leave type
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultAmount:
 *                 type: number
 *               maxCarryForward:
 *                 type: number
 *               resetFrequency:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router
    .route('/')
    .get(validate(leavePolicyQuerySchema, 'query'), catchAsync(leavePolicyController.getAllLeavePolicies))
    .post(validate(createLeavePolicySchema), catchAsync(leavePolicyController.createLeavePolicy));

/**
 * @swagger
 * /api/leave-policies/{id}:
 *   get:
 *     summary: Get a leave policy by ID
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
 *         description: Leave policy details
 *   put:
 *     summary: Update a leave policy
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
 *               defaultAmount:
 *                 type: number
 *               maxCarryForward:
 *                 type: number
 *               resetFrequency:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete a leave policy
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
    .get(validate(idParamSchema, 'params'), catchAsync(leavePolicyController.getLeavePolicyById))
    .put(validate(idParamSchema, 'params'), validate(updateLeavePolicySchema), catchAsync(leavePolicyController.updateLeavePolicy))
    .delete(validate(idParamSchema, 'params'), catchAsync(leavePolicyController.deleteLeavePolicy));

module.exports = router;
