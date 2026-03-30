const Announcement = require('../models/Announcement');
const { NotFoundError } = require('../utils/errors');

const announcementService = {
  getEmployeeAnnouncements: async ({ user, page, limit }) => {
    const query = {
      isActive: true,
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
        {
          $or: [
            { targetAudience: 'all' },
            {
              $and: [
                { targetAudience: 'department' },
                { targetDepartments: user.employment.department },
              ],
            },
            {
              $and: [
                { targetAudience: 'role' },
                { targetRoles: user.employment.role },
              ],
            },
            {
              $and: [
                { targetAudience: 'specific' },
                { targetEmployees: user._id },
              ],
            },
          ],
        },
      ],
    };

    // console.log('🔍 Announcement Query:', JSON.stringify(query, null, 2));

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('publishedBy', 'personalInfo.firstName personalInfo.lastName')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    const formattedAnnouncements = announcements.map(a => ({
      ...a,
      id: a._id,
      isRead: a.readBy?.some(r => r.user?.toString() === user._id.toString()) || false,
      isAcknowledged: a.acknowledgedBy?.some(acc => acc.user?.toString() === user._id.toString()) || false,
    }));

    return { announcements: formattedAnnouncements, total };
  },

  markRead: async (id, userId) => {
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const alreadyRead = announcement.readBy.some(r => r.user.toString() === userId.toString());
    if (!alreadyRead) {
      announcement.readBy.push({ user: userId, readAt: new Date() });
      await announcement.save();
    }

    return announcement;
  },

  acknowledge: async (id, userId) => {
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const alreadyAcknowledged = announcement.acknowledgedBy.some(a => a.user.toString() === userId.toString());
    if (!alreadyAcknowledged) {
      announcement.acknowledgedBy.push({ user: userId, acknowledgedAt: new Date() });
      await announcement.save();
    }

    return announcement;
  },

  markAllRead: async (user) => {
    const query = {
      isActive: true,
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
        {
          $or: [
            { targetAudience: 'all' },
            {
              $and: [
                { targetAudience: 'department' },
                { targetDepartments: user.employment.department },
              ],
            },
            {
              $and: [
                { targetAudience: 'role' },
                { targetRoles: user.employment.role },
              ],
            },
            {
              $and: [
                { targetAudience: 'specific' },
                { targetEmployees: user._id },
              ],
            },
          ],
        },
      ],
      'readBy.user': { $ne: user._id }
    };

    const results = await Announcement.updateMany(query, {
      $push: { readBy: { user: user._id, readAt: new Date() } }
    });

    return results;
  },

  getAnnouncementById: async (id) => {
    const announcement = await Announcement.findById(id)
      .populate('publishedBy', 'personalInfo.firstName personalInfo.lastName')
      .lean();

    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    return announcement;
  },

  createAnnouncement: async (data) => {
    const announcement = await Announcement.create(data);
    return announcement;
  },

  updateAnnouncement: async (id, data) => {
    const announcement = await Announcement.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    return announcement;
  },

  deleteAnnouncement: async (id) => {
    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    return announcement;
  },
};

module.exports = announcementService;
