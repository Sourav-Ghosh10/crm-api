const PDFDocument = require('pdfkit');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'nrnst-logo.png');

/**
 * Generates a professional PDF payslip
 * @param {Object} payslip - Payslip data
 * @param {Object} user - User data
 * @returns {Promise<Buffer>} - PDF as buffer
 */
const generatePayslipPDF = async (payslip, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const monthName = moment().month(payslip.month - 1).format('MMMM');

      // Header Area
      doc.rect(0, 0, doc.page.width, 140).fill('#f8fafc');

      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 50, 32, { fit: [180, 75] });
      } else {
        doc.fillColor('#4f46e5').fontSize(24).text('NRNST TECH', 50, 45, { weight: 'bold' });
        doc.fillColor('#64748b').fontSize(10).text('PRIVATE LIMITED', 50, 75);
      }
      
      doc.fillColor('#1e293b').fontSize(28).text('PAYSLIP', 0, 45, { align: 'right', indent: 50 });
      doc.fillColor('#4f46e5').fontSize(12).text(`${monthName.toUpperCase()} ${payslip.year}`, 0, 80, { align: 'right', indent: 50 });

      doc.moveDown(4);

      // Employee Info Section
      doc.fillColor('#1e293b').fontSize(14).text('EMPLOYEE DETAILS', 50, 160);
      doc.rect(50, 180, 500, 1).fill('#e2e8f0');

      const joinDateStr = user.employment?.dateOfJoining
        ? moment(user.employment.dateOfJoining).format('DD MMM YYYY')
        : 'N/A';

      doc.fontSize(9.5).fillColor('#64748b');
      doc.text('Name:', 50, 195);
      doc.text('Employee ID:', 50, 212);
      doc.text('Joining Date:', 50, 229);
      doc.text('Designation:', 50, 246);
      doc.text('Department:', 50, 263);
      doc.text('Days Worked / LOP:', 50, 280);

      doc.fillColor('#1e293b');
      doc.text(`${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() || 'N/A', 150, 195);
      doc.text(user.employeeId || user.employment?.employeeId || 'N/A', 150, 212);
      doc.text(joinDateStr, 150, 229);
      doc.text(user.employment?.designation?.name || user.employment?.designation || 'N/A', 150, 246);
      doc.text(user.employment?.department?.name || user.employment?.department || 'N/A', 150, 263);
      doc.text(`${payslip.daysWorked} / ${payslip.totalDays} (LOP: ${payslip.lopDays})`, 150, 280);

      // Bank & Statutory Info (Right Column)
      doc.fillColor('#64748b');
      doc.text('Bank Name:', 330, 195);
      doc.text('Bank Account No:', 330, 212);
      doc.text('IFSC Code:', 330, 229);
      doc.text('PAN Number:', 330, 246);
      doc.text('PF UAN:', 330, 263);

      doc.fillColor('#1e293b');
      doc.text(user.employment?.bankName || payslip.salaryConfigId?.bankName || 'N/A', 430, 195);
      doc.text(user.employment?.bankAccountNo || payslip.salaryConfigId?.bankAccountNo || 'N/A', 430, 212);
      doc.text(user.employment?.ifscCode || 'N/A', 430, 229);
      doc.text(user.employment?.panNumber || user.personalInfo?.panNumber || 'N/A', 430, 246);
      doc.text(user.employment?.uanNumber || 'N/A', 430, 263);

      // Table Header
      const tableTop = 315;
      doc.rect(50, tableTop, 500, 25).fill('#f1f5f9');
      doc.fillColor('#475569').fontSize(10);
      doc.text('DESCRIPTION', 60, tableTop + 8);
      doc.text('TYPE', 250, tableTop + 8);
      doc.text('AMOUNT', 450, tableTop + 8, { align: 'right', width: 90 });

      // Table Rows
      let currentY = tableTop + 35;
      payslip.items.forEach((item, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.fillColor('#1e293b').fontSize(10);
        doc.text(item.name, 60, currentY);
        doc.fillColor('#64748b').text(item.type, 250, currentY);
        doc.fillColor(item.type === 'DEDUCTION' ? '#dc2626' : '#059669').text(
          `${item.type === 'DEDUCTION' ? '-' : ''}Rs ${item.amount.toLocaleString()}`, 
          450, currentY, { align: 'right', width: 90 }
        );

        doc.rect(50, currentY + 15, 500, 0.5).fill('#f1f5f9');
        currentY += 25;
      });

      // Summary Section
      const summaryTop = currentY + 20;
      doc.rect(300, summaryTop, 250, 100).fill('#f8fafc');
      doc.rect(300, summaryTop, 250, 1).fill('#e2e8f0');

      doc.fillColor('#64748b').fontSize(10);
      doc.text('Gross Earnings:', 320, summaryTop + 20);
      doc.text('Total Deductions:', 320, summaryTop + 40);
      
      doc.fillColor('#1e293b').fontSize(10);
      doc.text(`Rs ${payslip.grossEarnings.toLocaleString()}`, 450, summaryTop + 20, { align: 'right', width: 90 });
      doc.text(`Rs ${payslip.totalDeductions.toLocaleString()}`, 450, summaryTop + 40, { align: 'right', width: 90 });

      doc.rect(320, summaryTop + 60, 210, 1).fill('#e2e8f0');
      
      doc.fillColor('#4f46e5').fontSize(14).text('Net Payable:', 320, summaryTop + 75);
      doc.text(`Rs ${payslip.netPay.toLocaleString()}`, 450, summaryTop + 75, { align: 'right', width: 90 });

      // Footer
      doc.fillColor('#94a3b8').fontSize(8).text(
        'This is a system generated document and does not require a physical signature.',
        50, 750, { align: 'center', width: 500 }
      );
      
      doc.text(
        `Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`,
        50, 765, { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePayslipPDF };
