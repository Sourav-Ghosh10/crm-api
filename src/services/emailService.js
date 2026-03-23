const { getEmailTransporter } = require('../config/email');
const logger = require('../utils/logger');

const emailService = {
  sendEmail: async ({ to, subject, text, html }) => {
    try {
      const transporter = getEmailTransporter();

      if (!transporter) {
        logger.error('Email transporter not configured');
        return false;
      }

      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);

      return true;
    } catch (error) {
      logger.error('Email send error:', error);
      return false;
    }
  },

  sendWelcomeEmail: async (user) => {
    const subject = 'Welcome to Pulse Ops';
    const text = `Hi ${user.personalInfo.firstName},\n\nWelcome to Pulse Ops! Your account has been created successfully.\n\nBest regards,\nPulse Ops Team`;
    const html = `
      <h2>Welcome to Pulse Ops</h2>
      <p>Hi ${user.personalInfo.firstName},</p>
      <p>Welcome to Pulse Ops! Your account has been created successfully.</p>
      <p>Best regards,<br/>Pulse Ops Team</p>
    `;

    return emailService.sendEmail({
      to: user.personalInfo.email,
      subject,
      text,
      html,
    });
  },

  sendPasswordResetEmail: async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `Hi ${user.personalInfo.firstName},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nPulse Ops Team`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.personalInfo.firstName},</p>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br/>Pulse Ops Team</p>
    `;

    return emailService.sendEmail({
      to: user.personalInfo.email,
      subject,
      text,
      html,
    });
  },

  sendLeaveApprovalEmail: async (user, leaveRequest) => {
    const subject = 'Leave Request Approved';
    const text = `Hi ${user.personalInfo.firstName},\n\nYour leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been approved.\n\nBest regards,\nPulse Ops Team`;
    const html = `
      <h2>Leave Request Approved</h2>
      <p>Hi ${user.personalInfo.firstName},</p>
      <p>Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been approved.</p>
      <p>Best regards,<br/>Pulse Ops Team</p>
    `;

    return emailService.sendEmail({
      to: user.personalInfo.email,
      subject,
      text,
      html,
    });
  },
};

module.exports = emailService;
