const Joi = require('joi');
const { objectIdSchema } = require('./commonValidator');

const announcementQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().valid('general', 'holiday', 'event', 'policy', 'urgent'),
  priority: Joi.string().valid('low', 'medium', 'high'),
});

const createAnnouncementSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  content: Joi.string().trim().max(5000).required(),
  category: Joi.string().valid('general', 'holiday', 'event', 'policy', 'urgent').default('general'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  targetAudience: Joi.string().valid('all', 'department', 'role', 'specific').default('all'),
  targetDepartments: Joi.array().items(Joi.string()),
  targetRoles: Joi.array().items(Joi.string()),
  targetEmployees: Joi.array().items(objectIdSchema),
  expiresAt: Joi.date().greater('now'),
  isActive: Joi.boolean().default(true),
  attachments: Joi.array().items(
    Joi.object({
      fileName: Joi.string().required(),
      fileUrl: Joi.string().uri().required(),
      uploadedAt: Joi.date().default(Date.now),
    })
  ),
});

const updateAnnouncementSchema = createAnnouncementSchema.fork(
  ['title', 'content', 'category', 'priority', 'targetAudience'],
  (schema) => schema.optional()
);

module.exports = {
  announcementQuerySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
