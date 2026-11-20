const express = require('express');
const activityController = require('../controllers/activityController');
const birthdayController = require('../controllers/birthdayController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: General employee-related endpoints
 */

/**
 * @swagger
 * /api/employee/recent-activity:
 *   get:
 *     summary: Get a unified timeline of employee activities for a specific day
 *     tags: [Employee]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *         description: Employee ID (Admin/Manager only)
 *     responses:
 *       200:
 *         description: Activities list
 */
router.get('/recent-activity', activityController.getRecentActivity);

/**
 * @swagger
 * /api/employee/upcoming-birthdays:
 *   get:
 *     summary: Get upcoming employee birthdays and check if today is the logged-in user's birthday
 *     tags: [Employee]
 *     responses:
 *       200:
 *         description: List of today's birthdays and upcoming birthdays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     todayDate:
 *                       type: string
 *                     isTodayMyBirthday:
 *                       type: boolean
 *                     myDaysRemaining:
 *                       type: integer
 *                     myNextBirthdayDate:
 *                       type: string
 *                     todayBirthdays:
 *                       type: array
 *                       items:
 *                         type: object
 *                     upcomingBirthdays:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/upcoming-birthdays', birthdayController.getUpcomingBirthdays);

module.exports = router;
