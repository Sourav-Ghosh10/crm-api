const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

const createEmailTransporter = () => {
  try {
    const isGmail = process.env.EMAIL_HOST?.includes('gmail.com');

    logger.info(`Attempting to initialize email transporter for: ${process.env.EMAIL_USER?.trim()}`);

    const config = isGmail ? {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASSWORD?.trim(),
      },
    } : {
      host: process.env.EMAIL_HOST?.trim(),
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
      auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASSWORD?.trim(),
      },
    };

    transporter = nodemailer.createTransport(config);

    // Verify connection configuration
    transporter.verify((error, _success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('Email transporter is ready');
      }
    });

    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    return null;
  }
};

const getEmailTransporter = () => {
  if (!transporter) {
    transporter = createEmailTransporter();
  }
  return transporter;
};

module.exports = {
  createEmailTransporter,
  getEmailTransporter,
};
