const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const notificationService = {
  createNotification: async ({
    recipientId,
    type,
    title,
    message,
    relatedEntity,
    actionUrl,
    priority = 'medium',
  }) => {
    try {
      const notification = await Notification.create({
        recipientId,
        type,
        title,
        message,
        relatedEntity,
        actionUrl,
        priority,
      });

      logger.info(`Notification created for user: ${recipientId}`);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  },

  getUserNotifications: async (userId, { page = 1, limit = 20, isRead }) => {
    const query = { recipientId: userId };

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return { notifications, total };
  },

  markAsRead: async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    return notification;
  },

  markAllAsRead: async (userId) => {
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  },

  getUnreadCount: async (userId) =>
    Notification.countDocuments({ recipientId: userId, isRead: false }),
};

module.exports = notificationService;
