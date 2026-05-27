const express = require('express');
const leaveController = require('../controllers/leaveController');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { validate } = require('../middleware/validate');
const {
    createLeaveSchema,
    updateLeaveStatusSchema,
    leaveQuerySchema,
    updateBalanceSchema,
    cancelLeaveSchema
} = require('../validators/leaveValidator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leave Requests
 *   description: Leave request management
 */

/**
 * @swagger
 * /api/leave-requests:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - startDate
 *               - endDate
 *               - reason
 *             properties:
 *               leaveType:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               halfDay:
 *                 type: boolean
 *               reason:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *       400:
 *         description: Validation error or overlapping leave exists
 *   get:
 *     summary: Get all leave requests (Admin/Manager view)
 *     tags: [Leave Requests]
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
 *         name: search
 *         schema:
 *           type: string
 *           description: Search by employee name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: leaveType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of leave requests
 */
router
    .route('/')
    .post(validate(createLeaveSchema), catchAsync(leaveController.createLeaveRequest))
    .get(
        validate(leaveQuerySchema, 'query'),
        catchAsync(leaveController.getLeaveRequests)
    );

/**
 * @swagger
 * /api/leave-requests/calculate-days:
 *   get:
 *     summary: Calculate number of leave days
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: halfDay
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Calculation result
 */
router.get('/calculate-days', catchAsync(leaveController.calculateLeaveDuration));

/**
 * @swagger
 * /api/leave-requests/stats:
 *   get:
 *     summary: Get leave approval stats for dashboard cards
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/stats', catchAsync(leaveController.getLeaveStats));

/**
 * @swagger
 * /api/leave-requests/my-requests:
 *   get:
 *     summary: Get current user's leave requests
 *     tags: [Leave Requests]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: leaveType
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Search within leave reason
 *     responses:
 *       200:
 *         description: List of user's leave requests
 */
router.get('/my-requests', validate(leaveQuerySchema, 'query'), catchAsync(leaveController.getMyLeaveRequests));

/**
 * @swagger
 * /api/leave-requests/my-stats:
 *   get:
 *     summary: Get current user's leave dashboard stats
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personalized statistics
 */
router.get('/my-stats', catchAsync(leaveController.getMyLeaveDashboardStats));

/**
 * @swagger
 * /api/leave-requests/{id}/status:
 *   patch:
 *     summary: Update leave request status (Approve/Reject)
 *     tags: [Leave Requests]
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
 *                 enum: [approved, rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave status updated successfully
 */
router
    .route('/:id/status')
    .patch(
        validate(updateLeaveStatusSchema),
        catchAsync(leaveController.updateLeaveStatus)
    );

/**
 * @swagger
 * /api/leave-requests/{id}/cancel:
 *   patch:
 *     summary: Cancel own leave request
 *     tags: [Leave Requests]
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
 *               cancelReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request cancelled successfully
 */
router.patch('/:id/cancel', validate(cancelLeaveSchema), catchAsync(leaveController.cancelMyLeave));

/**
 * @swagger
 * /api/leave-requests/balance:
 *   get:
 *     summary: Get current user's leave balance
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's leave balance
 */
router.get('/balance', catchAsync(leaveController.getLeaveBalance));

/**
 * @swagger
 * /api/leave-requests/employee/{userId}/balance:
 *   get:
 *     summary: Get specific user's leave balance (Admin/Manager)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's leave balance
 *       403:
 *         description: Forbidden
 *   patch:
 *     summary: Update specific user's leave balance (Admin/HR)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leaveBalance:
 *                 type: object
 *                 description: Map of leave types to balance amounts
 *     responses:
 *       200:
 *         description: Balance updated successfully
 */
router
    .route('/employee/:userId/balance')
    .get(catchAsync(leaveController.getLeaveBalance))
    .patch(validate(updateBalanceSchema), catchAsync(leaveController.updateUserLeaveBalance));


module.exports = router;
