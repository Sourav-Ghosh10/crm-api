const express = require('express');
const payslipController = require('../controllers/payslipController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { 
  generatePayslipSchema, 
  updatePayslipStatusSchema 
} = require('../validators/payrollValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Payslips
 *   description: Employee payslip management and generation
 */

/**
 * @swagger
 * /api/payroll/payslips:
 *   get:
 *     summary: Get all payslips
 *     tags: [Payslips]
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
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, FINALIZED, CANCELLED]
 *     responses:
 *       200:
 *         description: List of payslips
 */
router.get('/', payslipController.getPayslips);

/**
 * @swagger
 * /api/payroll/payslips/generate:
 *   post:
 *     summary: Generate a new payslip
 *     tags: [Payslips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - month
 *               - year
 *               - totalDays
 *               - daysWorked
 *             properties:
 *               employeeId:
 *                 type: string
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               totalDays:
 *                 type: integer
 *               daysWorked:
 *                 type: integer
 *               lopDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Payslip generated
 */
router.post('/generate', validate(generatePayslipSchema), payslipController.generatePayslip);

/**
 * @swagger
 * /api/payroll/payslips/{id}:
 *   get:
 *     summary: Get payslip by ID
 *     tags: [Payslips]
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
 *         description: Payslip details
 *   delete:
 *     summary: Delete payslip
 *     tags: [Payslips]
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
 *         description: Payslip deleted
 */
router.get('/:id', validate(idParamSchema, 'params'), payslipController.getPayslipById);
router.delete('/:id', validate(idParamSchema, 'params'), payslipController.deletePayslip);

/**
 * @swagger
 * /api/payroll/payslips/{id}/status:
 *   patch:
 *     summary: Update payslip status
 *     tags: [Payslips]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, FINALIZED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(updatePayslipStatusSchema), payslipController.updateStatus);

module.exports = router;
