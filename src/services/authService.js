const User = require('../models/User');
const Attendance = require('../models/Attendance');
const moment = require('moment');
const { getRedisClient } = require('../config/redis');
const {
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
  verifyRefreshToken,
} = require('../utils/tokenUtils');
const { UnauthorizedError, NotFoundError, BadRequestError, InternalError } = require('../utils/errors');
const {
  SESSION_EXPIRY_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
} = require('../config/constants');
const logger = require('../utils/logger');
const emailService = require('./emailService');

const authService = {
  login: async ({ email, password, ipAddress, checked = false }) => {
    const user = await User.findOne({ 'personalInfo.email': email }).select('+passwordHash');

    if (!user) {
      throw new UnauthorizedError('Invalid user. Please try again.');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Your account is currently inactive. Please contact the administrator.');
    }
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new UnauthorizedError('Account is locked. Please try again later.');
    }
    if (checked && user.isAdmin === false) {
      throw new UnauthorizedError('You are not authorized to admin login');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.accountLockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await user.save();
      throw new UnauthorizedError('Password mismatch');
    }



    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate session
    const sessionId = generateSessionId();
    const accessToken = generateAccessToken(user._id, sessionId);
    const refreshToken = generateRefreshToken(user._id, sessionId);

    // Store session in Redis
    const redisClient = getRedisClient();
    if (redisClient) {
      const sessionKey = `session:${user._id}:${sessionId}`;
      try {
        await redisClient.setEx(
          sessionKey,
          SESSION_EXPIRY_SECONDS,
          JSON.stringify({ userId: user._id, sessionId, ipAddress })
        );
      } catch (redisError) {
        logger.error('Failed to store session in Redis:', redisError);
        // Continue login process even if Redis fails
      }
    }

    // Remove password hash from response
    const userObj = user.toObject();
    delete userObj.passwordHash;

    // Check for incomplete shifts (from previous days)
    const today = moment.utc().startOf('day').toDate();
    const incompleteAttendance = await Attendance.findOne({
      employeeId: user._id,
      date: { $lt: today },
      $or: [
        { 'sessions.checkOut.time': { $exists: false } },
        { checkOut: { $exists: false } }
      ]
    }).sort({ date: -1 }).lean();

    let logoutCorrectionData = null;
    if (incompleteAttendance) {
      const lastSession = incompleteAttendance.sessions[incompleteAttendance.sessions.length - 1];
      if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
        logoutCorrectionData = {
          requiresLogoutCorrection: true,
          shiftId: incompleteAttendance._id,
          loginTime: lastSession.checkIn.time,
          shiftDate: moment(incompleteAttendance.date).format('YYYY-MM-DD')
        };
      }
    }

    return {
      user: userObj,
      accessToken,
      refreshToken,
      sessionId,
      ...(logoutCorrectionData || {})
    };
  },

  logout: async (userId, sessionId) => {
    const redisClient = getRedisClient();
    if (redisClient) {
      const sessionKey = `session:${userId}:${sessionId}`;
      await redisClient.del(sessionKey);
    }

    logger.info(`User logged out: ${userId}`);
  },

  refreshToken: async (refreshToken) => {
    // Verify refresh token
    let decoded;

    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if session exists
    const redisClient = getRedisClient();
    if (redisClient) {
      const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
      const sessionExists = await redisClient.exists(sessionKey);

      if (!sessionExists) {
        throw new UnauthorizedError('Session expired');
      }
    }

    // Generate new tokens
    const { sessionId } = decoded;
    const newAccessToken = generateAccessToken(decoded.userId, sessionId);
    const newRefreshToken = generateRefreshToken(decoded.userId, sessionId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },
  forgotPassword: async ({ email }) => {
    const user = await User.findOne({ 'personalInfo.email': email });

    if (!user) {
      throw new NotFoundError('User with this email does not exist');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Explicitly mark fields as modified
    user.markModified('resetPasswordOTP');
    user.markModified('resetPasswordExpires');

    await user.save({ validateBeforeSave: true });

    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Your Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
      });
    } catch (emailError) {
      logger.error('Failed to send OTP email:', emailError);
      throw new InternalError('Error sending email. Please try again later.');
    }

    return { message: 'OTP sent to email successfully' };
  },
  verifyOTP: async ({ email, otp }) => {
    const user = await User.findOne({
      'personalInfo.email': email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired OTP');
    }

    return { message: 'OTP verified successfully' };
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    const user = await User.findOne({
      'personalInfo.email': email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() }
    });
    console.log(user);
    if (!user) {
      throw new BadRequestError('Invalid request or session expired');
    }

    // Update password (ensure your User model hashes this on 'save')
    user.passwordHash = newPassword;

    // Clear OTP fields so they can't be used again
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return { message: 'Password has been reset successfully' };
  },

  googleLogin: async ({ idToken, emailcheck, ipAddress }) => {
    const { getAuth } = require('../config/firebase');

    let decodedToken;
    const user = await User.findOne({ 'personalInfo.email': emailcheck });

    if (!user) {
      throw new UnauthorizedError(
        'User not matched. Google login is available only for admin-registered users.'
      );
    }
    try {
      const auth = getAuth();
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      logger.error('Firebase token verification failed:', error);
      throw new UnauthorizedError('Invalid Firebase token');
    }

    const { uid: firebaseUid, email, name } = decodedToken;

    if (!email) {
      throw new BadRequestError('Email not found in Firebase token');
    }

    // const user = await User.findOne({ 'personalInfo.email': email });

    // if (!user) {
    //   throw new NotFoundError('User not found. Please contact admin for registration.');
    // }

    if (!user.googleId) {
      user.googleId = firebaseUid;
    }

    user.lastLogin = new Date();
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    const sessionId = generateSessionId();
    const accessToken = generateAccessToken(user._id, sessionId);
    const refreshToken = generateRefreshToken(user._id, sessionId);

    const redisClient = getRedisClient();
    if (redisClient) {
      const sessionKey = `session:${user._id}:${sessionId}`;
      try {
        await redisClient.setEx(
          sessionKey,
          SESSION_EXPIRY_SECONDS,
          JSON.stringify({ userId: user._id, sessionId, ipAddress })
        );
      } catch (redisError) {
        logger.error('Failed to store session in Redis:', redisError);
      }
    }

    // Remove password hash from response
    const userObj = user.toObject();
    delete userObj.passwordHash;

    // Check for incomplete shifts (from previous days)
    const today = moment.utc().startOf('day').toDate();
    const incompleteAttendance = await Attendance.findOne({
      employeeId: user._id,
      date: { $lt: today },
      $or: [
        { 'sessions.checkOut.time': { $exists: false } },
        { checkOut: { $exists: false } }
      ]
    }).sort({ date: -1 }).lean();

    let logoutCorrectionData = null;
    if (incompleteAttendance) {
      const lastSession = incompleteAttendance.sessions[incompleteAttendance.sessions.length - 1];
      if (lastSession && (!lastSession.checkOut || !lastSession.checkOut.time)) {
        logoutCorrectionData = {
          requiresLogoutCorrection: true,
          shiftId: incompleteAttendance._id,
          loginTime: lastSession.checkIn.time,
          shiftDate: moment(incompleteAttendance.date).format('YYYY-MM-DD')
        };
      }
    }

    return {
      user: userObj,
      accessToken,
      refreshToken,
      sessionId,
      ...(logoutCorrectionData || {})
    };
  },
};

module.exports = authService;
