const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateScheduleSchema, scheduleQuerySchema, bulkUpdateScheduleSchema } = require('../validators/scheduleValidator');

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Schedules
 *   description: Employee schedule and roster management
 */

/**
 * @swagger
 * /api/schedules/all:
 *   get:
 *     summary: Get all employee rosters with pagination
 *     description: Returns a paginated list of employee rosters with their shift data for a date range.
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
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
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rosters retrieved successfully
 */
router.get('/all', validate(scheduleQuerySchema, 'query'), scheduleController.getAllRosters);

/**
 * @swagger
 * /api/schedules/users-by-date:
 *   get:
 *     summary: Get list of users with schedules grouped by date
 *     tags: [Schedules]
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
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: dailyUserLimit
 *         schema:
 *           type: integer
 *         description: Limit number of users per date
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: List of users grouped by date
 */
router.get('/users-by-date', scheduleController.getScheduledUsersByDate);

/**
 * @swagger
 * /api/schedules/{userId}/roster:
 *   get:
 *     summary: Get employee roster
 *     description: Returns a continuous day-by-day roster for a date range. Generates missing days based on history or defaults.
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The User ID (ObjectId)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD or ISO). Defaults to today.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD or ISO). Defaults to today + 60 days.
 *     responses:
 *       200:
 *         description: Roster retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 60
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       employeeId:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       shiftType:
 *                         type: string
 *                         enum: [day, night, afternoon, flexible, off]
 *                       startTime:
 *                         type: string
 *                       endTime:
 *                         type: string
 *       404:
 *         description: User not found
 */
router.get('/:userId/roster', scheduleController.getEmployeeRoster);

/**
 * @swagger
 * /api/schedules/bulk-update:
 *   put:
 *     summary: Bulk update schedule entries
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 scheduleId:
 *                   type: string
 *                   required: true
 *                 shiftType:
 *                   type: string
 *                   enum: [day, night, afternoon, flexible, off]
 *                 startTime:
 *                   type: array
 *                   items:
 *                     type: string
 *                 endTime:
 *                   type: array
 *                   items:
 *                     type: string
 *                 location:
 *                   type: string
 *                 notes:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bulk update processed
 */
router.put('/bulk-update', validate(bulkUpdateScheduleSchema), scheduleController.bulkUpdateSchedules);

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: Update a schedule entry
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shiftType:
 *                 type: string
 *                 enum: [day, night, afternoon, flexible, off]
 *               startTime:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of start times for multiple shifts (e.g. ["09:00", "15:00"])
 *               endTime:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of end times matching startTime indices (e.g. ["13:00", "19:00"])
 *               location:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       404:
 *         description: Schedule not found
 */
router.put('/:id', validate(updateScheduleSchema), scheduleController.updateSchedule);

/**
 * @swagger
 * /api/schedules/generate-roster:
 *   post:
 *     summary: Manually trigger roster generation
 *     description: Generates rosters for all active users for the next 60 days.
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roster generation started
 */
router.post('/generate-roster', scheduleController.generateAllRosters);

module.exports = router;
