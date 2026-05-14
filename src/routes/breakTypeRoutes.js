const express = require('express');
const breakTypeController = require('../controllers/breakTypeController');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { validate } = require('../middleware/validate');
const {
    createBreakTypeSchema,
    updateBreakTypeSchema,
    breakTypeQuerySchema,
} = require('../validators/breakTypeValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: BreakTypes
 *   description: Break type management
 */

/**
 * @swagger
 * /api/break-types:
 *   get:
 *     summary: Get all break types
 *     tags: [BreakTypes]
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
 *     responses:
 *       200:
 *         description: List of break types
 *   post:
 *     summary: Create a new break type
 *     tags: [BreakTypes]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               isPaid:
 *                 type: boolean
 *               maxDuration:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Break type created
 * 
 * /api/break-types/{id}:
 *   get:
 *     summary: Get break type by ID
 *     tags: [BreakTypes]
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
 *         description: Break type details
 *   put:
 *     summary: Update break type
 *     tags: [BreakTypes]
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
 *         description: Break type updated
 *   delete:
 *     summary: Delete break type
 *     tags: [BreakTypes]
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
 *         description: Break type deleted
 */

router
    .route('/')
    .get(validate(breakTypeQuerySchema, 'query'), catchAsync(breakTypeController.getAllBreakTypes))
    .post(validate(createBreakTypeSchema), catchAsync(breakTypeController.createBreakType));

router
    .route('/:id')
    .get(validate(idParamSchema, 'params'), catchAsync(breakTypeController.getBreakTypeById))
    .put(validate(idParamSchema, 'params'), validate(updateBreakTypeSchema), catchAsync(breakTypeController.updateBreakType))
    .delete(validate(idParamSchema, 'params'), catchAsync(breakTypeController.deleteBreakType));

module.exports = router;
