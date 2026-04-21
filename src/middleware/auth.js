const { verifyAccessToken } = require('../utils/tokenUtils');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const User = require('../models/User');
const { getRedisClient } = require('../config/redis');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if session exists in Redis
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isReady) {
      const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
      try {
        const session = await redisClient.get(sessionKey);
        if (!session) {
          // Session not in Redis — could mean Redis failed to store it during login.
          // JWT is already cryptographically verified above, so we allow the request
          // but log a warning. This prevents redirect loops when Redis is temporarily unavailable.
          logger.warn(`Session not found in Redis for key: ${sessionKey}. Allowing via JWT-only auth.`);
        }
      } catch (redisError) {
        // Redis query error — log and continue (JWT already verified)
        logger.error('Redis session check error:', redisError.message);
      }
    }

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Attach user to request
    req.user = user;
    req.sessionId = decoded.sessionId;

    // Enforcement: Check for incomplete shifts (missing logouts from previous days)
    // Avoid blocking specific exempt paths
    const exemptPaths = ['/correct-logout', '/check-correction', '/status', '/logout', '/attendance/status', '/auth/me'];
    const isExempt = exemptPaths.some(p => req.originalUrl.includes(p));

    if (!isExempt) {
      const Attendance = require('../models/Attendance');
      const moment = require('moment');
      const today = moment.utc().startOf('day').toDate();

      const incompleteAttendance = await Attendance.findOne({
        employeeId: user._id,
        date: { $lt: today },
        $or: [
          { 'sessions.checkOut.time': { $exists: false } },
          { checkOut: { $exists: false } }
        ]
      }).lean();

      if (incompleteAttendance) {
        const lastSession = incompleteAttendance.sessions[incompleteAttendance.sessions.length - 1];
        if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
          return res.status(403).json({
            success: false,
            requiresLogoutCorrection: true,
            data: {
              shiftId: incompleteAttendance._id,
              loginTime: lastSession.checkIn.time,
              shiftDate: moment(incompleteAttendance.date).format('YYYY-MM-DD')
            },
            message: 'Please correct your previous incomplete shift logout before proceeding.'
          });
        }
      }
    }

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const roleName = req.user?.employment?.role;
    
    // If user is an admin or has 'Super Admin' role name, they have access to everything
    const isSpecialAdmin = (req.user && req.user.isAdmin === true) || 
                          (roleName === 'Super Admin' || roleName === 'admin');

    if (isSpecialAdmin) {
      return next();
    }

    if (!req.user || !roles.includes(roleName)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
