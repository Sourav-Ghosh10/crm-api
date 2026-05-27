const Joi = require('joi');
const { objectIdSchema } = require('./commonValidator');

const timeItem = Joi.alternatives().try(
  Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  Joi.array().items(Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/))
);

const flattenArray = (value) => {
  if (Array.isArray(value)) {
    return value.flat();
  }
  return value;
};

const createScheduleSchema = Joi.object({
  employeeId: objectIdSchema.required(),
  date: Joi.date().iso().required(),
  shiftType: Joi.string().valid('day', 'night', 'afternoon', 'flexible', 'off').default('day'),
  startTime: Joi.when('shiftType', {
    is: 'off',
    then: Joi.array().items(timeItem).custom(flattenArray),
    otherwise: Joi.array().items(timeItem).min(1).required().custom(flattenArray)
  }),
  endTime: Joi.when('shiftType', {
    is: 'off',
    then: Joi.array().items(timeItem).custom(flattenArray),
    otherwise: Joi.array().items(timeItem).min(1).required().custom(flattenArray)
  }),
  location: Joi.string().max(100),
  department: Joi.string().max(100),
  notes: Joi.string().max(500).allow(''),
  isRecurring: Joi.boolean(),
  recurrencePattern: Joi.when('isRecurring', {
    is: true,
    then: Joi.object({
      frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
      endsOn: Joi.date().iso(),
      daysOfWeek: Joi.array().items(
        Joi.string().valid(
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        )
      ),
    }),
  }),
});

const updateScheduleSchema = Joi.object({
  shiftType: Joi.string().valid('day', 'night', 'afternoon', 'flexible', 'off'),
  startTime: Joi.array().items(timeItem).custom(flattenArray),
  endTime: Joi.array().items(timeItem).custom(flattenArray),
  location: Joi.string().max(100),
  department: Joi.string().max(100),
  notes: Joi.string().max(500).allow(''),
  isRecurring: Joi.boolean(),
  recurrencePattern: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly'),
    endsOn: Joi.date().iso(),
    daysOfWeek: Joi.array().items(
      Joi.string().valid(
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      )
    ),
  }),
});

const scheduleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  employeeId: objectIdSchema,
  employeeIds: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  search: Joi.string().allow('', null),
  role: Joi.string().allow('', null),
  department: Joi.string().allow('', null),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  shiftType: Joi.string().valid('day', 'night', 'afternoon', 'flexible', 'off'),
});

const bulkUpdateScheduleSchema = Joi.array().items(
  updateScheduleSchema.keys({
    scheduleId: objectIdSchema.required(),
  })
).min(1).required();

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  scheduleQuerySchema,
  bulkUpdateScheduleSchema,
};
