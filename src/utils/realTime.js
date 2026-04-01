const axios = require('axios');
const logger = require('./logger');

let syncPoint = {
    realTime: Date.now(),
    localUptime: process.uptime(),
    isSynced: false
};

const syncWithExternalTime = async () => {
    const backupSources = [
        'https://worldtimeapi.org/api/timezone/Etc/UTC',
        'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
        'https://worldtimeapi.org/api/ip'
    ];

    for (const source of backupSources) {
        try {
            const response = await axios.get(source, { timeout: 5000 });
            console.log(`🕒 Syncing with ${source}...`);
            let dateStr = response.data.datetime || response.data.dateTime;
            
            if (dateStr) {
                // Ensure the string is treated as UTC if it doesn't specify an offset
                if (!dateStr.includes('+') && !dateStr.includes('Z')) {
                    dateStr += 'Z';
                }
                timestamp = new Date(dateStr).getTime();
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
