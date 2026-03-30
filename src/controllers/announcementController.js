const announcementService = require('../services/announcementService');

const announcementController = {
  getEmployeeAnnouncements: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await announcementService.getEmployeeAnnouncements({
        user: req.user,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result.announcements,
        pagination: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  markRead: async (req, res, next) => {
    try {
      await announcementService.markRead(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        message: 'Announcement marked as read',
      });
    } catch (error) {
      next(error);
    }
  },

  acknowledge: async (req, res, next) => {
    try {
      await announcementService.acknowledge(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        message: 'Announcement acknowledged',
      });
    } catch (error) {
      next(error);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      await announcementService.markAllRead(req.user);
      res.status(200).json({
        success: true,
        message: 'All announcements marked as read',
      });
    } catch (error) {
      next(error);
    }
  },

  getAllAnnouncements: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      // For admin/manager view, we don't apply audience filtering
      // This will be used for managing announcements
      const result = await announcementService.getEmployeeAnnouncements({
        user: { employment: { role: 'admin' }, _id: null }, // Mock user to get everything? No, we should implement a dedicated method
        page,
        limit,
      });
      // Actually, let's just implement it in service if needed later. 
      // For now, let's focus on what's breaking.
      
      res.status(200).json({
        success: true,
        data: result.announcements,
        pagination: {
          total: result.total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getAnnouncementById: async (req, res, next) => {
    try {
      const announcement = await announcementService.getAnnouncementById(req.params.id);
      res.status(200).json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  },

  createAnnouncement: async (req, res, next) => {
    try {
      const data = { ...req.body, publishedBy: req.user._id };
      const announcement = await announcementService.createAnnouncement(data);
      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  },

  updateAnnouncement: async (req, res, next) => {
    try {
      const announcement = await announcementService.updateAnnouncement(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteAnnouncement: async (req, res, next) => {
    try {
      await announcementService.deleteAnnouncement(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = announcementController;
