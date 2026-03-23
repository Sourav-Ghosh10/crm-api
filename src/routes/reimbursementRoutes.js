const express = require('express');
const reimbursementController = require('../controllers/reimbursementController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
    createReimbursementSchema,
    updateReimbursementSchema,
    updateReimbursementStatusSchema,
    payReimbursementSchema,
    reimbursementQuerySchema,
} = require('../validators/reimbursementValidator');
const { USER_ROLES } = require('../config/constants');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Reimbursements
 *   description: Reimbursement request management
 */

/**
 * @swagger
 * /api/reimbursements:
 *   post:
 *     summary: Create a new reimbursement request
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reimbursementType, title, amount, expenseDate]
 *             properties:
 *               reimbursementType:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               expenseDate:
 *                 type: string
 *                 format: date
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *     responses:
 *       201:
 *         description: Request submitted successfully
 */
router.post(
    '/',
    validate(createReimbursementSchema),
    reimbursementController.createRequest
);

/**
 * @swagger
 * /api/reimbursements/my:
 *   get:
 *     summary: Get current user's reimbursement requests
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or employee ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, rejected]
 *       - in: query
 *         name: reimbursementType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get('/my', validate(reimbursementQuerySchema, 'query'), reimbursementController.getMyRequests);

/**
 * @swagger
 * /api/reimbursements:
 *   get:
 *     summary: Get all reimbursement requests (Admin/HR/Manager)
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or employee ID
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by specific employee ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, rejected]
 *       - in: query
 *         name: reimbursementType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get(
    '/',
    validate(reimbursementQuerySchema, 'query'),
    reimbursementController.getAllRequests
);

/**
 * @swagger
 * /api/reimbursements/{id}:
 *   get:
 *     summary: Get reimbursement request details
 *     tags: [Reimbursements]
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
 *         description: Request details
 *   put:
 *     summary: Update a reimbursement request (Pending only)
 *     description: Allows the employee to update their request details as long as it is still in 'pending' status.
 *     tags: [Reimbursements]
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
 *             $ref: '#/components/schemas/ReimbursementUpdate'
 *     responses:
 *       200:
 *         description: Request updated
 *       400:
 *         description: Cannot edit approved or rejected request
 *   delete:
 *     summary: Delete a pending reimbursement request
 *     tags: [Reimbursements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request deleted
 */
router
    .route('/:id')
    .get(reimbursementController.getRequestDetails)
    .put(validate(updateReimbursementSchema), reimbursementController.updateRequest)
    .patch(validate(updateReimbursementSchema), reimbursementController.updateRequest)
    .delete(reimbursementController.deleteRequest);

/**
 * @swagger
 * /api/reimbursements/{id}/status:
 *   patch:
 *     summary: Update reimbursement request status (Approve/Reject)
 *     tags: [Reimbursements]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
    '/:id/status',
    validate(updateReimbursementStatusSchema),
    reimbursementController.updateStatus
);

/**
 * @swagger
 * /api/reimbursements/{id}/pay:
 *   patch:
 *     summary: Mark reimbursement request as paid
 *     tags: [Reimbursements]
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
 *             required: [paidAmount, paymentMode]
 *             properties:
 *               paidAmount:
 *                 type: number
 *               paymentMode:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded
 */
router.patch(
    '/:id/pay',
    validate(payReimbursementSchema),
    reimbursementController.markPaid
);

module.exports = router;
