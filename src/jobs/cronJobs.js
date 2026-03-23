const cron = require('node-cron');
const scheduleService = require('../services/scheduleService');

const initCronJobs = () => {
    // Schedule a task to run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Starting daily roster generation...');
        try {
            await scheduleService.generateRostersForAllUsers();
            console.log('[Cron] Daily roster generation completed successfully.');
        } catch (error) {
            console.error('[Cron] Error during daily roster generation:', error);
        }
    });

    // Monthly Leave Balance Reset (Midnight on the 1st of every month)
    cron.schedule('0 0 1 * *', async () => {
        console.log('[Cron] Starting monthly leave balance reset...');
        try {
            const leaveBalanceService = require('../services/leaveBalanceService');
            await leaveBalanceService.resetBalances('monthly');
        } catch (error) {
            console.error('[Cron] Error during monthly leave balance reset:', error);
        }
    });

    // Yearly Leave Balance Reset (Midnight on January 1st)
    cron.schedule('0 0 1 1 *', async () => {
        console.log('[Cron] Starting yearly leave balance reset...');
        try {
            const leaveBalanceService = require('../services/leaveBalanceService');
            await leaveBalanceService.resetBalances('yearly');
        } catch (error) {
            console.error('[Cron] Error during yearly leave balance reset:', error);
        }
    });

    console.log('[Cron] Cron jobs initialized.');
};

module.exports = initCronJobs;
