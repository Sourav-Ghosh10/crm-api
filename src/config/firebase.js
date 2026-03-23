const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp;

const initializeFirebase = () => {
    try {
        // Check if Firebase is already initialized
        if (firebaseApp) {
            return firebaseApp;
        }

        // Initialize Firebase Admin SDK
        // Using environment variables for configuration
        const serviceAccount = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
        };

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        logger.info('✅ Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        logger.error('❌ Firebase Admin SDK initialization failed:', error);
        throw error;
    }
};

const getAuth = () => {
    if (!firebaseApp) {
        initializeFirebase();
    }
    return admin.auth();
};

module.exports = {
    initializeFirebase,
    getAuth,
};
