const axios = require('axios');
const logger = require('./logger');

let syncPoint = {
    realTime: Date.now(),
    localUptime: process.uptime(),
    isSynced: false
};

const syncWithExternalTime = async () => {
    const backupSources = [
        'https://worldtimeapi.org/api/timezone/Asia/Kolkata',
        'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata',
        'https://worldtimeapi.org/api/ip'
    ];

    for (const source of backupSources) {
        try {
            const response = await axios.get(source, { timeout: 5000 });
            let timestamp;
            
            if (response.data && response.data.datetime) {
                timestamp = new Date(response.data.datetime).getTime();
            } else if (response.data && response.data.dateTime) {
                timestamp = new Date(response.data.dateTime).getTime();
            }

            if (timestamp) {
                syncPoint = {
                    realTime: timestamp,
                    localUptime: process.uptime(),
                    isSynced: true
                };
                logger.info(`🕒 Server time synchronized with ${source}`);
                return;
            }
        } catch (error) {
            logger.warn(`🕒 Failed to sync with ${source}: ${error.message}`);
        }
    }

    // if all fail, use system time but mark as not synced
    syncPoint.realTime = Date.now();
    syncPoint.localUptime = process.uptime();
    syncPoint.isSynced = false;
    logger.error('🕒 All time synchronization sources failed. Using system clock.');
};

// Initial sync
syncWithExternalTime();

// Re-sync every hour
setInterval(syncWithExternalTime, 3600000);

const getRealTime = () => {
    const elapsedSeconds = process.uptime() - syncPoint.localUptime;
    return new Date(syncPoint.realTime + elapsedSeconds * 1000);
};

module.exports = { getRealTime };
