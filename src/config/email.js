const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

const createEmailTransporter = () => {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: parseInt(process.env.EMAIL_PORT, 10) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

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
