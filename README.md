
# # Pulse Ops - Backend API

A comprehensive HR Management System backend built with Node.js, Express, MongoDB, and Redis.

## Features

- **User Management**: Complete employee management with roles and permissions
- **Attendance Tracking**: Check-in/out with geolocation support
- **Leave Management**: Leave requests with approval workflow
- **Schedule Management**: Shift scheduling with recurring patterns
- **Reimbursement**: Expense tracking and approval
- **Timesheet**: Time tracking with billable hours
- **Notifications**: In-app notifications system
- **Announcements**: Company-wide or targeted announcements
- **Audit Logging**: Complete audit trail for all actions
- **Security**: JWT authentication, role-based access control, rate limiting, IP whitelisting

## Technology Stack

- **Runtime**: Node.js 18.x+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB 6.x
- **Cache**: Redis 7.x
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston
- **File Storage**: AWS S3
- **Email**: Nodemailer

## Prerequisites

- Node.js 18.x or higher
- MongoDB 6.x
- Redis 7.x (optional, but recommended)
- AWS Account (for S3 file uploads)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd HRM-Backend-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**

Copy the `.env.example` file to `.env` and update with your values:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- Redis connection details
- JWT secrets
- AWS credentials
- Email SMTP settings

4. **Start MongoDB and Redis**

Ensure MongoDB and Redis are running on your system.

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using PM2
```bash
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
npm run pm2:logs
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Health Check
```
GET /health
```

### Main Endpoints

- **Auth**: `/api/auth` - Login, logout, token refresh
- **Users**: `/api/users` - User management
- **Attendance**: `/api/attendance` - Attendance tracking
- **Leave**: `/api/leave` - Leave requests
- **Schedule**: `/api/schedule` - Shift scheduling
- **Reimbursement**: `/api/reimbursement` - Expense claims
- **Timesheet**: `/api/timesheet` - Time tracking
- **Announcements**: `/api/announcements` - Company announcements
- **Notifications**: `/api/notifications` - User notifications

## Project Structure

```
HRM-Backend-main/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── validators/      # Joi validation schemas
│   ├── utils/           # Utility functions
│   ├── jobs/            # Scheduled jobs
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── logs/                # Application logs
├── .env.example         # Environment template
├── package.json         # Dependencies
└── ecosystem.config.js  # PM2 configuration
```

## Security

- Helmet.js for HTTP headers security
- CORS configuration
- Rate limiting on API endpoints
- JWT token authentication
- Password hashing with bcrypt
- Input sanitization (NoSQL injection, XSS)
- IP whitelisting support

## Testing

```bash
npm test
```

## Code Quality

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
```

## License

MIT

## Support

For support, email support@pulseops.com or create an issue in the repository.

