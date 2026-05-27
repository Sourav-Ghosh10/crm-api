// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client',
};

// Employment Types
const EMPLOYMENT_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERN: 'intern',
};

// Leave Types
const LEAVE_TYPES = {
  CASUAL: 'casual',
  SICK: 'sick',
  EARNED: 'earned',
  COMP_OFF: 'compOff',
};

// Leave Status
const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Attendance Status
const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half-day',
  ON_LEAVE: 'on-leave',
  HOLIDAY: 'holiday',
  WEEKEND: 'weekend',
};

// Reimbursement Status
const REIMBURSEMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

// Reimbursement Types
const REIMBURSEMENT_TYPES = {
  TRAVEL: 'travel',
  FOOD: 'food',
  MEDICAL: 'medical',
  OFFICE: 'office',
  TRAINING: 'training',
  INTERNET: 'internet',
  OTHER: 'other',
};

// Payment Modes
const PAYMENT_MODES = {
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  UPI: 'upi',
  CHEQUE: 'cheque',
};

// Notification Types
const NOTIFICATION_TYPES = {
  LEAVE_REQUEST: 'leave-request',
  LEAVE_APPROVED: 'leave-approved',
  LEAVE_REJECTED: 'leave-rejected',
  SHIFT_REMINDER: 'shift-reminder',
  ATTENDANCE_ALERT: 'attendance-alert',
  BIRTHDAY: 'birthday',
  ANNOUNCEMENT: 'announcement',
  SYSTEM: 'system',
};

// Days of Week
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Default Leave Balance
const DEFAULT_LEAVE_BALANCE = {
  casual: 12,
  sick: 7,
  earned: 15,
  compOff: 0,
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Session
const SESSION_EXPIRY_SECONDS = parseInt(process.env.SESSION_EXPIRY_SECONDS, 10) || 86400;

// Password
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
const ACCOUNT_LOCK_DURATION_MINUTES = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 10) || 15;

module.exports = {
  USER_ROLES,
  EMPLOYMENT_TYPES,
  LEAVE_TYPES,
  LEAVE_STATUS,
  ATTENDANCE_STATUS,
  REIMBURSEMENT_STATUS,
  REIMBURSEMENT_TYPES,
  PAYMENT_MODES,
  NOTIFICATION_TYPES,
  WEEKDAYS,
  DEFAULT_LEAVE_BALANCE,
  PAGINATION,
  SESSION_EXPIRY_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
};
