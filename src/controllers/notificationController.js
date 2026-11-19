const notificationService = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');

const notificationController = {
  getNotifications: catchAsync(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

    const { notifications, total } = await notificationService.getUserNotifications(req.user._id, {
      page,
      limit,
      isRead,
    });
    const unreadCount = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }),

  getUnreadCount: catchAsync(async (req, res) => {
    const unreadCount = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  }),

  markAsRead: catchAsync(async (req, res) => {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  }),

  markAllAsRead: catchAsync(async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  }),
};

module.exports = notificationController;
