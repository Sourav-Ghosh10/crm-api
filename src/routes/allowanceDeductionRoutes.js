const express = require('express');
const allowanceDeductionController = require('../controllers/allowanceDeductionController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { 
  createMasterSchema, 
  updateMasterSchema 
} = require('../validators/payrollValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Payroll Masters
 *   description: Allowance and Deduction Master management
 */

/**
 * @swagger
 * /api/payroll/masters:
 *   get:
 *     summary: Get all allowance/deduction masters
 *     tags: [Payroll Masters]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ALLOWANCE, DEDUCTION]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of masters
 *   post:
 *     summary: Create a new allowance/deduction master
 *     tags: [Payroll Masters]
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
 *               - type
 *               - value
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ALLOWANCE, DEDUCTION]
 *               calculationType:
 *                 type: string
 *                 enum: [FIXED, PERCENTAGE]
 *               value:
 *                 type: number
 *               isTaxable:
 *                 type: boolean
 *               displayOrder:
 *                 type: number
 *     responses:
 *       201:
 *         description: Master created
 */
router.get('/', allowanceDeductionController.getMasters);
router.post('/', validate(createMasterSchema), allowanceDeductionController.createMaster);

/**
 * @swagger
 * /api/payroll/masters/{id}:
 *   get:
 *     summary: Get master by ID
 *     tags: [Payroll Masters]
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
 *         description: Master details
 *   put:
 *     summary: Update master
 *     tags: [Payroll Masters]
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
 *         description: Master updated
 *   delete:
 *     summary: Delete master
 *     tags: [Payroll Masters]
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
 *         description: Master deleted
 */
router.get('/:id', validate(idParamSchema, 'params'), allowanceDeductionController.getMasterById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateMasterSchema), allowanceDeductionController.updateMaster);
router.delete('/:id', validate(idParamSchema, 'params'), allowanceDeductionController.deleteMaster);

/**
 * @swagger
 * /api/payroll/masters/{id}/status:
 *   patch:
 *     summary: Toggle master status
 *     tags: [Payroll Masters]
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
router.patch('/:id/status', validate(idParamSchema, 'params'), allowanceDeductionController.toggleStatus);

module.exports = router;
