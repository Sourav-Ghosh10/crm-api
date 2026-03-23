const moment = require('moment');

const formatDate = (date, format = 'YYYY-MM-DD') => moment(date).format(format);

const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => moment(date).format(format);

const addDays = (date, days) => moment(date).add(days, 'days').toDate();

const subtractDays = (date, days) => moment(date).subtract(days, 'days').toDate();

const getDaysBetween = (startDate, endDate) => {
  const start = moment(startDate);
  const end = moment(endDate);
  return end.diff(start, 'days');
};

const isWeekend = (date) => {
  const day = moment(date).day();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

const getStartOfDay = (date) => moment(date).startOf('day').toDate();

const getEndOfDay = (date) => moment(date).endOf('day').toDate();

const getStartOfMonth = (date) => moment(date).startOf('month').toDate();

const getEndOfMonth = (date) => moment(date).endOf('month').toDate();

const isToday = (date) => moment(date).isSame(moment(), 'day');

const isFuture = (date) => moment(date).isAfter(moment());

const isPast = (date) => moment(date).isBefore(moment());

const getWeekday = (date) => moment(date).format('dddd');

const parseDate = (dateString) => moment(dateString).toDate();

module.exports = {
  formatDate,
  formatDateTime,
  addDays,
  subtractDays,
  getDaysBetween,
  isWeekend,
  getStartOfDay,
  getEndOfDay,
  getStartOfMonth,
  getEndOfMonth,
  isToday,
  isFuture,
  isPast,
  getWeekday,
  parseDate,
};
