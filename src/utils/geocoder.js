const axios = require('axios');
const logger = require('./logger');

/**
 * Reverse geocodes latitude and longitude into a human-readable physical address.
 * Uses OpenStreetMap Nominatim (Free, no API key required).
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} The exact physical address or a fallback string
 */
const reverseGeocode = async (latitude, longitude) => {
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        return '';
    }

    try {
        // Nominatim requires a distinct User-Agent header to avoid rate limiting
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'json',
                lat: latitude,
                lon: longitude,
                zoom: 16,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'mve-crm-api/1.0.0 (contact@mve-hrm.com)'
            },
            timeout: 5000 // 5 seconds timeout
        });

        if (response.data && response.data.display_name) {
            return response.data.display_name;
        }

        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
        logger.error(`Reverse geocoding failed for [${latitude}, ${longitude}]: ${error.message}`);
        // Return coordinates as fallback
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
};

module.exports = {
    reverseGeocode
};
