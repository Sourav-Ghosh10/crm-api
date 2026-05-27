const express = require('express');
const activityController = require('../controllers/activityController');
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

module.exports = router;
