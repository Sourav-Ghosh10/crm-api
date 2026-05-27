const express = require('express');
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../config/constants');
const { validate } = require('../middleware/validate');
const { announcementQuerySchema, createAnnouncementSchema, updateAnnouncementSchema } = require('../validators/announcementValidator');
const { idParamSchema } = require('../validators/userValidator'); // Assuming idParamSchema is generic or we use user's one

const router = express.Router();

// All announcement routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Company announcement management
 */

/**
 * @swagger
 * /api/announcements/employee:
 *   get:
 *     summary: Get announcements targeted to the current employee
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: List of targeted announcements
 */
router.get('/employee', validate(announcementQuerySchema, 'query'), announcementController.getEmployeeAnnouncements);

/**
 * @swagger
 * /api/announcements/employee/mark-all-read:
 *   put:
 *     summary: Mark all targeted announcements as read
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: All announcements marked as read
 */
router.put('/employee/mark-all-read', announcementController.markAllRead);

/**
 * @swagger
 * /api/announcements/{id}/mark-read:
 *   put:
 *     summary: Mark announcement as read
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Announcement marked as read
 */
router.put('/:id/mark-read', validate(idParamSchema, 'params'), announcementController.markRead);

/**
 * @swagger
 * /api/announcements/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge announcement
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Announcement acknowledged
 */
router.put('/:id/acknowledge', validate(idParamSchema, 'params'), announcementController.acknowledge);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all announcements (Admin/HR/Manager only)
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: List of all announcements
 */
router.get('/', authorize(USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.MANAGER), validate(announcementQuerySchema, 'query'), announcementController.getAllAnnouncements);

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     summary: Get announcement by ID
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Announcement details
 */
router.get('/:id', validate(idParamSchema, 'params'), announcementController.getAnnouncementById);

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: Create new announcement (Admin/HR only)
 *     tags: [Announcements]
 *     responses:
 *       201:
 *         description: Announcement created successfully
 */
router.post('/', authorize(USER_ROLES.ADMIN, USER_ROLES.HR), validate(createAnnouncementSchema), announcementController.createAnnouncement);

/**
 * @swagger
 * /api/announcements/{id}:
 *   put:
 *     summary: Update announcement (Admin/HR only)
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 */
router.put('/:id', authorize(USER_ROLES.ADMIN, USER_ROLES.HR), validate(idParamSchema, 'params'), validate(updateAnnouncementSchema), announcementController.updateAnnouncement);

/**
 * @swagger
 * /api/announcements/{id}:
 *   delete:
 *     summary: Delete announcement (Admin/HR only)
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 */
router.delete('/:id', authorize(USER_ROLES.ADMIN, USER_ROLES.HR), validate(idParamSchema, 'params'), announcementController.deleteAnnouncement);

module.exports = router;
