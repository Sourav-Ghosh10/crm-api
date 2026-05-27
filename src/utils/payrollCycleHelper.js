const moment = require('moment-timezone');
const SystemSettings = require('../models/SystemSettings');

/**
 * Resolves the startDate and endDate (Date objects) of the payroll cycle for a given month and year.
 * Handles custom payroll cycle settings.
 * 
 * @param {number|string} year - 4 digit year (e.g., 2026)
 * @param {number|string} month - 1-based month (1 = Jan, 12 = Dec)
 * @param {string} [timezone='Asia/Kolkata'] - Timezone for calculations
 * @returns {Promise<{ startDate: Date, endDate: Date, startDay: number, endDay: number }>}
 */
const getPayrollCycleInterval = async (year, month, timezone = 'Asia/Kolkata') => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    // 1. Fetch configured payroll cycle settings from database
    const setting = await SystemSettings.findOne({ key: 'payroll_cycle_settings' });
    const settings = (setting && setting.value) ? setting.value : { startDay: 1, endDay: 31 };

    const startDay = parseInt(settings.startDay || 1, 10);
    const endDay = parseInt(settings.endDay || 31, 10);

    // 2. Generate date range using moment-timezone to easily handle month/year rollovers and leap years
    const targetMonthMoment = moment.tz(`${y}-${String(m).padStart(2, '0')}-01`, 'YYYY-MM-DD', timezone);

    if (startDay === 1) {
        const startDate = targetMonthMoment.clone().startOf('month').toDate();
        const endDate = targetMonthMoment.clone().endOf('month').toDate();
        return { startDate, endDate, startDay, endDay };
    } else {
        const startMonthMoment = targetMonthMoment.clone().subtract(1, 'months');
        const resolvedStartDay = Math.min(startDay, startMonthMoment.daysInMonth());
        const startDate = startMonthMoment.date(resolvedStartDay).startOf('day').toDate();

        const resolvedEndDay = Math.min(endDay, targetMonthMoment.daysInMonth());
        const endDate = targetMonthMoment.date(resolvedEndDay).endOf('day').toDate();

        return { startDate, endDate, startDay, endDay };
    }
};

module.exports = {
    getPayrollCycleInterval
};
