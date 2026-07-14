const axios = require('axios');
const logger = require('./logger');

let syncPoint = {
    offsetMs: 0,
    isSynced: false
};

const syncWithExternalTime = async () => {
    // Try HTTP Date headers from atomic edge servers (Google/Cloudflare) first as they never rate limit or drift
    const headerSources = ['https://www.google.com', 'https://www.cloudflare.com'];
    for (const source of headerSources) {
        try {
            const response = await axios.head(source, { timeout: 4000 });
            if (response.headers && response.headers.date) {
                const timestamp = new Date(response.headers.date).getTime();
                if (timestamp && !isNaN(timestamp)) {
                    syncPoint = {
                        offsetMs: timestamp - Date.now(),
                        isSynced: true
                    };
                    logger.info(`🕒 Server time synchronized with ${source} header (Offset: ${syncPoint.offsetMs}ms)`);
                    return;
                }
            }
        } catch (error) {
            logger.warn(`🕒 Failed header sync with ${source}: ${error.message}`);
        }
    }

    const backupSources = [
        'https://worldtimeapi.org/api/timezone/Etc/UTC',
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
                const timestamp = new Date(dateStr).getTime();

                if (timestamp && !isNaN(timestamp)) {
                    syncPoint = {
                        offsetMs: timestamp - Date.now(),
                        isSynced: true
                    };
                    logger.info(`🕒 Server time synchronized with ${source} (Offset: ${syncPoint.offsetMs}ms)`);
                    return;
                }
            }
        } catch (error) {
            const isConnReset = error.code === 'ECONNRESET' || error.message.includes('ECONNRESET');
            if (isConnReset) {
                logger.warn(`🕒 Connection reset while syncing with ${source}. This is common for WorldTimeAPI.`);
            } else {
                logger.warn(`🕒 Failed to sync with ${source}: ${error.message}`);
            }
        }
    }

    // if all fail, use system clock with 0 offset
    syncPoint.offsetMs = 0;
    syncPoint.isSynced = false;
    logger.error('🕒 All time synchronization sources failed. Using system clock.');
};

// Initial sync
syncWithExternalTime();

// Re-sync every hour
setInterval(syncWithExternalTime, 3600000);

const getRealTime = () => {
    return new Date(Date.now() + syncPoint.offsetMs);
};

module.exports = { getRealTime };
