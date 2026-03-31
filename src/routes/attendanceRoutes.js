const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { checkInSchema, checkOutSchema } = require('../validators/attendanceValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/attendance/correct-logout:
 *   post:
 *     summary: Correct missing logout for a previous shift
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shiftId, logoutTime, shiftDate, reason]
 *             properties:
 *               shiftId: { type: string }
 *               logoutTime: { type: string, format: date-time }
 *               shiftDate: { type: string }
 *               reason: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Logout corrected
 */
router.post('/correct-logout', validate(require('../validators/attendanceValidator').correctLogoutSchema), attendanceController.correctLogout);

/**
 * @swagger
 * /api/attendance/check-correction:
 *   get:
 *     summary: Check if the user has any incomplete shifts requiring logout correction
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Check completed successfully
 */
router.get('/check-correction', attendanceController.checkLogoutCorrection);

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management
 */

/**
 * @swagger
 * /api/attendance/clock-in:
 *   post:
 *     summary: Clock in
 *     tags: [Attendance]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceInfo: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Clocked in
 */
router.post('/clock-in', validate(checkInSchema), attendanceController.clockIn);

/**
 * @swagger
 * /api/attendance/clock-out:
 *   post:
 *     summary: Clock out
 *     tags: [Attendance]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceInfo: { type: string }
 *     responses:
 *       200:
 *         description: Clocked out
 */
router.post('/clock-out', validate(checkOutSchema), attendanceController.clockOut);

/**
 * @swagger
 * /api/attendance/break-start:
 *   post:
 *     summary: Start break
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Break started
 */
router.post('/break-start', attendanceController.startBreak);

/**
 * @swagger
 * /api/attendance/break-resume:
 *   post:
 *     summary: Resume work from break
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Work resumed
 */
router.post('/break-resume', attendanceController.resumeWork);

/**
 * @swagger
 * /api/attendance/status:
 *   get:
 *     summary: Get today's attendance status for authenticated user
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Attendance status
 */
router.get('/status', attendanceController.getAttendanceStatus);

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get all attendance records (Admin)
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [present, absent, half-day, on-leave, holiday, weekend, Late] }
 *       - in: query
 *         name: search
 *         description: Search by name or username
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: designation
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Attendance list with pagination
 */
router.get('/', validate(require('../validators/attendanceValidator').attendanceQuerySchema, 'query'), attendanceController.getAllAttendance);

/**
 * @swagger
 * /api/attendance/me:
 *   get:
 *     summary: Get own attendance history
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [present, absent, half-day, on-leave, holiday, weekend] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Individual attendance history with pagination
 */
router.get('/me', validate(require('../validators/attendanceValidator').attendanceQuerySchema, 'query'), attendanceController.getMemberAttendance);

/**
 * @swagger
 * /api/attendance/summary:
 *   get:
 *     summary: Get attendance summary (all employees merged with records)
 *     tags: [Attendance]
 */
router.get('/summary', attendanceController.getAttendanceSummary);

/**
 * @swagger
 * /api/attendance/summary/stats:
 *   get:
 *     summary: Get attendance statistics for cards
 *     tags: [Attendance]
 */
router.get('/summary/stats', attendanceController.getAttendanceStats);

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get attendance details by ID
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance details
 */
router.get('/:id', validate(require('../validators/userValidator').idParamSchema, 'params'), attendanceController.getAttendanceById);

module.exports = router;
