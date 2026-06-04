const cron = require('node-cron');
const scheduleService = require('../services/scheduleService');

const initCronJobs = () => {
    // Weekly Roster Process (Every Sunday at 11:00 PM)
    cron.schedule('0 23 * * 0', async () => {
        console.log('[Cron] Starting weekly roster process (Generation + Cleanup)...');
        try {
            await scheduleService.processWeeklyRoster();
            console.log('[Cron] Weekly roster process completed successfully.');
        } catch (error) {
            console.error('[Cron] Error during weekly roster process:', error);
        }
    });

    // Monthly Leave Balance Reset (Midnight on the 1st of every month)
    cron.schedule('0 0 1 * *', async () => {
        console.log('[Cron] Starting monthly leave balance allocation...');
        try {
            const leaveBalanceService = require('../services/leaveBalanceService');
            await leaveBalanceService.allocateGlobalQuota('monthly');
        } catch (error) {
            console.error('[Cron] Error during monthly leave balance allocation:', error);
        }
    });

    // Yearly Leave Balance Reset (Midnight on January 1st)
    cron.schedule('0 0 1 1 *', async () => {
        console.log('[Cron] Starting yearly leave balance allocation...');
        try {
            const leaveBalanceService = require('../services/leaveBalanceService');
            await leaveBalanceService.allocateGlobalQuota('yearly');
        } catch (error) {
            console.error('[Cron] Error during yearly leave balance allocation:', error);
        }
    });

    console.log('[Cron] Cron jobs initialized.');
};

module.exports = initCronJobs;
