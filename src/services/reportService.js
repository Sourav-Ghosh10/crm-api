const moment = require('moment-timezone');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');

// ─── Helper: format a JS Date as "YYYY-MM-DD" in IST ────────────────────────
const toYMD = (date, tz = 'Asia/Kolkata') =>
    moment(date).tz(tz).format('YYYY-MM-DD');

// ─── Helper: day-of-week name (Sunday, Monday, …) ───────────────────────────
const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Generate all YYYY-MM-DD strings between startDate and endDate (inclusive)
const dateRange = (startYMD, endYMD) => {
    const dates = [];
    const cur = moment(startYMD, 'YYYY-MM-DD');
    const end = moment(endYMD, 'YYYY-MM-DD');
    while (cur.isSameOrBefore(end, 'day')) {
        dates.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'day');
    }
    return dates;
};

// ─── Build pivot monthly attendance workbook ─────────────────────────────────
const generateMonthlyPivotExcel = async (startDate, endDate, filterDept, filterDesig, filterSearch) => {
    const tz = 'Asia/Kolkata';

    // 1. Compute the list of all days in the range
    const days = dateRange(startDate, endDate);

    // 2. Fetch all active employees (apply optional filters)
    const userQuery = { isActive: true };
    if (filterDept)   userQuery['employment.department']  = filterDept;
    if (filterDesig)  userQuery['employment.designation'] = filterDesig;
    if (filterSearch) {
        const re = new RegExp(filterSearch, 'i');
        userQuery.$or = [
            { 'personalInfo.firstName': re },
            { 'personalInfo.lastName':  re },
            { username:                 re },
        ];
    }

    const employees = await User.find(userQuery)
        .select('personalInfo employment username employeeId')
        .lean();

    const employeeIds = employees.map(e => e._id);

    // 3. Fetch all attendance records in the range for these employees
    const startMoment = moment.tz(startDate, 'YYYY-MM-DD', tz).startOf('day');
    const endMoment   = moment.tz(endDate,   'YYYY-MM-DD', tz).endOf('day');

    const attendanceRecords = await Attendance.find({
        employeeId: { $in: employeeIds },
        date: { $gte: startMoment.toDate(), $lte: endMoment.toDate() },
    }).lean();

    // 4. Fetch active holidays in the range
    const holidays = await Holiday.find({
        isActive: true,
        date: { $gte: startMoment.toDate(), $lte: endMoment.toDate() },
    }).lean();
    const holidaySet = new Set(holidays.map(h => toYMD(h.date, tz)));

    // 5. Fetch approved leaves in the range
    const leaveRecords = await Leave.find({
        employeeId: { $in: employeeIds },
        status: 'approved',
        startDate: { $lte: endMoment.toDate() },
        endDate:   { $gte: startMoment.toDate() },
    }).lean();

    // 6. Build lookup maps
    // attendance: key = `${employeeId}_${YYYY-MM-DD}` → record
    const attMap = {};
    for (const rec of attendanceRecords) {
        const ymd = toYMD(rec.date, tz);
        const key = `${rec.employeeId}_${ymd}`;
        attMap[key] = rec;
    }

    // leaves: key = `${employeeId}` → array of {startYMD, endYMD}
    const leaveMap = {};
    for (const lv of leaveRecords) {
        const eid = String(lv.employeeId);
        if (!leaveMap[eid]) leaveMap[eid] = [];
        leaveMap[eid].push({
            start: toYMD(lv.startDate, tz),
            end:   toYMD(lv.endDate,   tz),
        });
    }

    // 7. Resolve each employee-day cell to a status code
    const resolveCode = (emp, ymd) => {
        const eid = String(emp._id);
        const attKey = `${eid}_${ymd}`;
        const rec = attMap[attKey];

        // If attendance record exists → P / L / HD
        if (rec) {
            const s = (rec.status || '').toLowerCase();
            if (s === 'half-day' || s === 'halfday') return 'HD';
            const recordIsLate = rec.isLate || (rec.sessions && rec.sessions.some(session => session.isLate));
            if (recordIsLate || s === 'late') return 'L';
            if (s === 'present') return 'P';
            if (s === 'absent')  return 'A';
            if (s === 'on-leave' || s === 'on_leave') return 'OL';
            if (s === 'holiday') return 'H';
            if (s === 'weekend') return 'W';
            return 'P'; // fallback for unknown present-like status
        }

        // No attendance record — check holiday
        if (holidaySet.has(ymd)) return 'H';

        // Check leave
        const empLeaves = leaveMap[eid] || [];
        for (const lv of empLeaves) {
            if (ymd >= lv.start && ymd <= lv.end) return 'OL';
        }

        // Check weekend
        const dowIdx = moment(ymd, 'YYYY-MM-DD').day(); // 0=Sun … 6=Sat
        const dowName = DOW_NAMES[dowIdx]; // e.g. "Sunday"
        const weeklyOff = emp.employment?.workingHours?.weeklyOff || [];
        // Accept "Sunday", "sunday", "Sun" etc.
        const isWeekend = weeklyOff.some(w =>
            dowName.toLowerCase().startsWith(w.toLowerCase().slice(0, 3))
        );
        // Fallback: if no weeklyOff configured, treat Sat+Sun as weekend
        if (isWeekend || (weeklyOff.length === 0 && (dowIdx === 0 || dowIdx === 6))) {
            return 'W';
        }

        return 'A';
    };

    // 8. Build the Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MVE-HRM';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Monthly Attendance', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
        views: [{ state: 'frozen', ySplit: 2, xSplit: 4 }],
    });

    // ── Colour palette ──
    const C = {
        headerBg:    '1E293B',  // dark slate
        headerFont:  'FFFFFF',
        dateBg:      '334155',
        dateFont:    'F1F5F9',
        empBg:       'F8FAFC',
        altEmpBg:    'F1F5F9',
        subHeaderBg: '475569',
        subHeaderFg: 'FFFFFF',
        // status colours (fill / font)
        P:  { fill: 'DCFCE7', font: '166534' }, // green
        L:  { fill: 'FEF9C3', font: '854D0E' }, // amber
        HD: { fill: 'DBEAFE', font: '1E40AF' }, // blue
        A:  { fill: 'FEE2E2', font: '991B1B' }, // red
        W:  { fill: 'F1F5F9', font: '64748B' }, // slate (weekend)
        H:  { fill: 'FDF4FF', font: '7E22CE' }, // purple (holiday)
        OL: { fill: 'FFF7ED', font: 'C2410C' }, // orange (on leave)
    };

    const borderThin = {
        top:    { style: 'thin', color: { argb: 'CBD5E1' } },
        left:   { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        right:  { style: 'thin', color: { argb: 'CBD5E1' } },
    };

    const headerFont = (bold = true) => ({ name: 'Calibri', size: 9, bold, color: { argb: C.headerFont } });

    // ── Row 1: Title banner ──
    const totalCols = 4 + days.length + 3; // emp+user+dept+desig + days + total+late+absent
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell(1, 1);
    const monthLabel = moment(startDate, 'YYYY-MM-DD').format('MMMM YYYY');
    titleCell.value = `MONTHLY ATTENDANCE REPORT — ${monthLabel.toUpperCase()}`;
    titleCell.font  = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    ws.getRow(1).height = 28;

    // ── Row 2: Column headers ──
    const fixedHeaders = ['Employee Name', 'Username', 'Department', 'Designation'];
    const aggHeaders   = ['Total Present', 'Late Arrival', 'Absent'];

    // fixed columns
    fixedHeaders.forEach((h, i) => {
        const cell = ws.getCell(2, i + 1);
        cell.value = h;
        cell.font  = headerFont();
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } };
        cell.border = borderThin;
    });

    // day columns
    days.forEach((ymd, i) => {
        const col  = 5 + i;
        const cell = ws.getCell(2, col);
        // Format as D/M/YYYY
        const m = moment(ymd, 'YYYY-MM-DD');
        cell.value = m.format('D/M/YYYY');
        // Colour Sat/Sun differently
        const dow = m.day();
        const isWknd = dow === 0 || dow === 6;
        cell.font  = { name: 'Calibri', size: 8, bold: true, color: { argb: isWknd ? 'F1F5F9' : C.dateFont } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: isWknd ? '475569' : C.dateBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
        cell.border = borderThin;
    });

    // aggregation columns
    aggHeaders.forEach((h, i) => {
        const col  = 5 + days.length + i;
        const cell = ws.getCell(2, col);
        cell.value = h;
        cell.font  = headerFont();
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
        cell.border = borderThin;
    });

    ws.getRow(2).height = 72;

    // ── Column widths ──
    ws.getColumn(1).width = 24; // Employee Name
    ws.getColumn(2).width = 14; // Username
    ws.getColumn(3).width = 18; // Department
    ws.getColumn(4).width = 18; // Designation
    for (let i = 0; i < days.length; i++) {
        ws.getColumn(5 + i).width = 5.5;
    }
    ws.getColumn(5 + days.length).width     = 13; // Total Present
    ws.getColumn(5 + days.length + 1).width = 12; // Late Arrival
    ws.getColumn(5 + days.length + 2).width = 10; // Absent

    // ── Data rows ──
    employees.forEach((emp, rowIdx) => {
        const dataRow = rowIdx + 3; // rows 1+2 are headers
        const isAlt   = rowIdx % 2 === 1;

        const fullName = `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.trim() || emp.username || 'Unknown';
        const dept     = emp.employment?.department  || '-';
        const desig    = emp.employment?.designation || '-';

        let totalPresent = 0;
        let lateArrival  = 0;
        let totalAbsent  = 0;

        // fixed info cells
        const fixedValues = [fullName, emp.username || '-', dept, desig];
        fixedValues.forEach((val, ci) => {
            const cell = ws.getCell(dataRow, ci + 1);
            cell.value = val;
            cell.font  = { name: 'Calibri', size: 9, bold: ci === 0 };
            cell.alignment = { horizontal: ci === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? C.altEmpBg : C.empBg } };
            cell.border = borderThin;
        });

        // day cells
        days.forEach((ymd, di) => {
            const code = resolveCode(emp, ymd);
            const col  = 5 + di;
            const cell = ws.getCell(dataRow, col);
            cell.value = code;

            const colours = C[code] || { fill: 'FFFFFF', font: '000000' };
            cell.font      = { name: 'Calibri', size: 8, bold: true, color: { argb: colours.font } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: colours.fill } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = borderThin;

            // Aggregation counting
            if (code === 'P' || code === 'L' || code === 'HD') totalPresent++;
            if (code === 'L')  lateArrival++;
            if (code === 'A')  totalAbsent++;
        });

        // aggregation cells
        const aggValues = [totalPresent, lateArrival, totalAbsent];
        const aggColors = [
            { fill: 'DCFCE7', font: '166534' }, // Total Present - green
            { fill: 'FEF9C3', font: '854D0E' }, // Late Arrival - amber
            { fill: 'FEE2E2', font: '991B1B' }, // Absent - red
        ];
        aggValues.forEach((val, ai) => {
            const col  = 5 + days.length + ai;
            const cell = ws.getCell(dataRow, col);
            cell.value = val;
            cell.font  = { name: 'Calibri', size: 9, bold: true, color: { argb: aggColors[ai].font } };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: aggColors[ai].fill } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = borderThin;
        });

        ws.getRow(dataRow).height = 18;
    });

    // ── Legend row at the bottom ──
    const legendRow = employees.length + 3;
    ws.getRow(legendRow).height = 16;
    const legendCodes = [
        { code: 'P',  label: 'Present' },
        { code: 'L',  label: 'Late' },
        { code: 'HD', label: 'Half Day' },
        { code: 'A',  label: 'Absent' },
        { code: 'W',  label: 'Weekend' },
        { code: 'H',  label: 'Holiday' },
        { code: 'OL', label: 'On Leave' },
    ];
    legendCodes.forEach(({ code, label }, li) => {
        const col  = 1 + li * 2;
        if (col + 1 > totalCols) return;
        ws.mergeCells(legendRow, col, legendRow, col + 1);
        const cell = ws.getCell(legendRow, col);
        const c    = C[code] || { fill: 'F8FAFC', font: '334155' };
        cell.value = `${code} = ${label}`;
        cell.font  = { name: 'Calibri', size: 8, bold: true, color: { argb: c.font } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = borderThin;
    });

    // 9. Write to buffer and return
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

// ─── Main report service ─────────────────────────────────────────────────────
const reportService = {
    generateReport: async (params) => {
        const { type, format, startDate, endDate, department, designation, search } = params;

        if (type === 'attendance') {
            if (format === 'excel' || format === 'xlsx' || format === 'csv') {
                const buffer = await generateMonthlyPivotExcel(
                    startDate,
                    endDate,
                    department,
                    designation,
                    search
                );

                const monthLabel = moment(startDate || new Date()).format('YYYY-MM');
                return {
                    data: Buffer.from(buffer),
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `attendance_report_${monthLabel}.xlsx`,
                };
            }

            // Fallback PDF (basic)
            const PDFDocument = require('pdfkit');
            return new Promise((resolve, reject) => {
                try {
                    const doc = new PDFDocument({ margin: 40, size: 'A4' });
                    const chunks = [];
                    doc.on('data', (chunk) => chunks.push(chunk));
                    doc.on('end', () => {
                        resolve({
                            data: Buffer.concat(chunks),
                            contentType: 'application/pdf',
                            filename: `attendance_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`,
                        });
                    });
                    doc.fillColor('#4f46e5').fontSize(22).text('ATTENDANCE REPORT', { align: 'center' });
                    doc.fontSize(10).fillColor('#64748b').text(`Period: ${startDate || '-'} to ${endDate || '-'}`, { align: 'center' });
                    doc.end();
                } catch (err) {
                    reject(err);
                }
            });
        }

        throw new Error(`Report type "${type}" is not supported yet.`);
    },
};

module.exports = reportService;
