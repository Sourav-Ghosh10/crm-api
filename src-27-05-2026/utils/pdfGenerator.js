const PDFDocument = require('pdfkit');
const moment = require('moment');

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
      
      doc.fillColor('#4f46e5').fontSize(24).text('NRNST TECH', 50, 45, { weight: 'bold' });
      doc.fillColor('#64748b').fontSize(10).text('PRIVATE LIMITED', 50, 75);
      
      doc.fillColor('#1e293b').fontSize(28).text('PAYSLIP', 0, 45, { align: 'right', indent: 50 });
      doc.fillColor('#4f46e5').fontSize(12).text(`${monthName.toUpperCase()} ${payslip.year}`, 0, 80, { align: 'right', indent: 50 });

      doc.moveDown(4);

      // Employee Info Section
      doc.fillColor('#1e293b').fontSize(14).text('EMPLOYEE DETAILS', 50, 160);
      doc.rect(50, 180, 500, 1).fill('#e2e8f0');

      doc.fontSize(10).fillColor('#64748b');
      doc.text('Name:', 50, 200);
      doc.text('Employee ID:', 50, 220);
      doc.text('Designation:', 50, 240);

      doc.fillColor('#1e293b');
      doc.text(`${user.personalInfo.firstName} ${user.personalInfo.lastName}`, 150, 200);
      doc.text(user.employment?.employeeId || 'N/A', 150, 220);
      doc.text(user.employment?.designation?.name || user.employment?.designation || 'N/A', 150, 240);

      // Attendance Info
      doc.fillColor('#64748b');
      doc.text('Total Days:', 350, 200);
      doc.text('Days Worked:', 350, 220);
      doc.text('LOP Days:', 350, 240);

      doc.fillColor('#1e293b');
      doc.text(payslip.totalDays.toString(), 450, 200);
      doc.text(payslip.daysWorked.toString(), 450, 220);
      doc.text(payslip.lopDays.toString(), 450, 240);

      doc.moveDown(4);

      // Table Header
      const tableTop = 300;
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
