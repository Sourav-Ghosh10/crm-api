const { getEmailTransporter } = require('../config/email');
const logger = require('../utils/logger');
const moment = require('moment');

const emailService = {
  sendEmail: async ({ to, subject, text, html, attachments }) => {
    try {
      const transporter = getEmailTransporter();

      if (!transporter) {
        logger.error('Email transporter not initialized');
        return false;
      }

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || text,
        attachments: attachments || [],
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Email send error (SMTP):', error);
      return false;
    }
  },

  sendWelcomeEmail: async (user) => {
    const subject = 'Welcome to CodecIT';
    const text = `Hi ${user.personalInfo.firstName},\n\nWelcome to CodecIT! Your account has been created successfully.\n\nBest regards,\nCodecIT Team`;
    const html = `
      <h2>Welcome to CodecIT</h2>
      <p>Hi ${user.personalInfo.firstName},</p>
      <p>Welcome to CodecIT! Your account has been created successfully.</p>
      <p>Best regards,<br/>CodecIT Team</p>
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
    const text = `Hi ${user.personalInfo.firstName},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nCodecIT Team`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.personalInfo.firstName},</p>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br/>CodecIT Team</p>
    `;

    return emailService.sendEmail({
      to: user.personalInfo.email,
      subject,
      text,
      html,
    });
  },

  sendLeaveApplicationEmail: async (employee, leaveRequest, recipients) => {
    const subject = `Leave Application: ${employee.fullName} (${employee.employeeId})`;
    const startDate = moment(leaveRequest.startDate).format('DD MMM YYYY');
    const endDate = moment(leaveRequest.endDate).format('DD MMM YYYY');
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Leave Application</h2>
        <p><strong>Employee:</strong> ${employee.fullName} (${employee.employeeId})</p>
        <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
        <p><strong>Duration:</strong> ${startDate} to ${endDate} (${leaveRequest.numberOfDays} days)</p>
        <p><strong>Reason:</strong> ${leaveRequest.reason}</p>
        <div style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/leave" style="background: #4f46e5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Request</a>
        </div>
      </div>
    `;

    // Send to each recipient
    const sendPromises = recipients.map(email => 
      emailService.sendEmail({
        to: email,
        subject,
        html,
      })
    );

    return Promise.all(sendPromises);
  },

  sendLeaveStatusUpdateEmail: async (employee, leaveRequest, status, comments) => {
    const subject = `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const startDate = moment(leaveRequest.startDate).format('DD MMM YYYY');
    const endDate = moment(leaveRequest.endDate).format('DD MMM YYYY');
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: ${status === 'approved' ? '#059669' : '#dc2626'};">Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <p>Hi ${employee.personalInfo.firstName},</p>
        <p>Your leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
        ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
        <div style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/leave" style="background: #4f46e5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Details</a>
        </div>
      </div>
    `;

    return emailService.sendEmail({
      to: employee.personalInfo.email,
      subject,
      html,
    });
  },

  sendPayslipEmail: async (user, payslip, pdfBuffer) => {
    const monthName = moment().month(payslip.month - 1).format('MMMM');
    const subject = `Payslip for ${monthName} ${payslip.year}`;
    
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 32px; border-radius: 16px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0;">PAYSLIP</h1>
          <p style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin: 4px 0 0 0;">${monthName} ${payslip.year}</p>
        </div>
        
        <p>Hi <strong>${user.personalInfo.firstName}</strong>,</p>
        <p>Your salary payslip for <strong>${monthName} ${payslip.year}</strong> has been finalized. Please find the attached PDF for the full breakdown.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 0 0 12px 0; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Summary</th>
                <th style="padding: 0 0 12px 0; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Amount</th>
              </tr>
            </thead>
            <tbody style="font-size: 14px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">Gross Earnings</td>
                <td style="padding: 12px 0; text-align: right; color: #059669;">₹ ${payslip.grossEarnings.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">Total Deductions</td>
                <td style="padding: 12px 0; text-align: right; color: #dc2626;">₹ ${payslip.totalDeductions.toLocaleString()}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 16px 0 0 0; font-weight: 700; color: #1e293b;">Net Payable Salary</td>
                <td style="padding: 16px 0 0 0; text-align: right; font-weight: 800; color: #4f46e5; font-size: 20px;">₹ ${payslip.netPay.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6;">The attached PDF contains the complete salary certificate including all components.</p>
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.FRONTEND_URL}/payroll" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View in Portal</a>
        </div>
      </div>
    `;

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `Payslip_${monthName}_${payslip.year}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    return emailService.sendEmail({
      to: user.personalInfo.email,
      subject,
      html,
      attachments,
    });
  },
};



module.exports = emailService;
