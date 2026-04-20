const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const { errorHandler } = require('./middleware/errorHandler');
// const { requestLogger } = require('./middleware/requestLogger');
// const { apiLimiter } = require('./middleware/rateLimiter');
const swaggerSpec = require('./config/swagger');

const app = express();

// Security Headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-timezone', 'x-client-timezone'],
  })
);

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// NoSQL injection prevention
app.use(mongoSanitize());

// XSS prevention
app.use(xss());

// Request logging
// Request logging
// app.use(requestLogger);

app.use((req, res, next) => {
  // console.error('DEBUG: Request reached main app router', req.method, req.path);
  next();
});

// Trigger restart

// Rate limiting for API routes
// app.use('/api', apiLimiter);

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check server health
 *     description: Returns the health status of the server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Server is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/designations', require('./routes/designationRoutes'));
app.use('/api/office-locations', require('./routes/officeLocationRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/employee', require('./routes/employeeRoutes'));
app.use('/api/leave-requests', require('./routes/leaveRoutes'));
app.use('/api/leave-types', require('./routes/leaveTypeRoutes'));
app.use('/api/reimbursements', require('./routes/reimbursementRoutes'));
app.use('/api/reimbursement-types', require('./routes/reimbursementTypeRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/payroll/masters', require('./routes/allowanceDeductionRoutes'));
app.use('/api/payroll/salary-configs', require('./routes/salaryConfigRoutes'));
app.use('/api/payroll/payslips', require('./routes/payslipRoutes'));
// app.use('/api/leave-policies', require('./routes/leavePolicyRoutes'));

app.get('/api/list-attendance', async (req, res) => {
  const Attendance = require('./models/Attendance');
  const User = require('./models/User');
  const user = await User.findOne({ 'personalInfo.email': 'demo@example.com' });
  const records = await Attendance.find({ employeeId: user._id });
  res.json({
    userId: user._id,
    count: records.length,
    records: records.map(r => ({ id: r._id, date: r.date, sessions: r.sessions.length }))
  });
});

app.get('/api', (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({
    success: true,
    message: 'CodecIT API',
    version: '1.0.0',
    db: mongoose.connection.db?.databaseName,
    host: mongoose.connection.host
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
