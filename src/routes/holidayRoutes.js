const express = require('express');
const holidayController = require('../controllers/holidayController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
    holidayQuerySchema,
    createHolidaySchema,
    updateHolidaySchema,
    toggleStatusSchema
} = require('../validators/holidayValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Holidays
 *   description: Holiday management
 */

/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get all holidays
 *     tags: [Holidays]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of holidays
 *   post:
 *     summary: Create a new holiday
 *     tags: [Holidays]
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
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Holiday created
 */
router.get('/', validate(holidayQuerySchema, 'query'), holidayController.getHolidays);
router.post('/', validate(createHolidaySchema), holidayController.createHoliday);

/**
 * @swagger
 * /api/holidays/{id}:
 *   get:
 *     summary: Get holiday by ID
 *     tags: [Holidays]
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
 *         description: Holiday details
 *   put:
 *     summary: Update holiday
 *     tags: [Holidays]
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
 *         description: Holiday updated
 *   delete:
 *     summary: Delete holiday
 *     tags: [Holidays]
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
 *         description: Holiday deleted
 */
router.get('/:id', validate(idParamSchema, 'params'), holidayController.getHolidayById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateHolidaySchema), holidayController.updateHoliday);
router.delete('/:id', validate(idParamSchema, 'params'), holidayController.deleteHoliday);

/**
 * @swagger
 * /api/holidays/{id}/status:
 *   patch:
 *     summary: Toggle holiday status
 *     tags: [Holidays]
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
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(toggleStatusSchema), holidayController.toggleStatus);

module.exports = router;
