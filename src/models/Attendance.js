const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../config/constants');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkIn: {
      time: Date,
      ipAddress: String,
      deviceInfo: String,
    },
    checkOut: {
      time: Date,
      ipAddress: String,
      deviceInfo: String,
    },
    sessions: [{
      checkIn: {
        time: Date,
        ipAddress: String,
        deviceInfo: String,
      },
      checkOut: {
        time: Date,
        ipAddress: String,
        deviceInfo: String,
      },
      duration: Number, // in hours
      durationString: String, // e.g., "1H 2M 2S"
      isLate: { type: Boolean, default: false },
      isEarlyLeave: { type: Boolean, default: false },
    }],
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.PRESENT,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    totalDurationString: String, // e.g., "1H 2M 2S"
    breakTime: {
      type: Number,
      default: 0,
    },
    totalBreakDurationString: String, // e.g., "1H 2M 2S"
    breaks: [{
      startTime: Date,
      endTime: Date,
      duration: Number, // in minutes
      durationString: String // e.g., "1H 2M 2S"
    }],
    overtime: {
      type: Number,
      default: 0,
    },
    remarks: String,
    isLate: {
      type: Boolean,
      default: false,
    },
    isEarlyLeave: {
      type: Boolean,
      default: false,
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    correctedAt: Date,
    correctionSource: String, // e.g., "manual"
  },
  {
    timestamps: true,
  }
);

// Compound index for unique attendance per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Helper to format duration in MS to "1H 2M 2S"
const formatDuration = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}H`);
  if (minutes > 0) parts.push(`${minutes}M`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}S`);

  return parts.join(' ');
};

// Pre-save hook to calculate total hours
attendanceSchema.pre('save', function () {
  let grossMins = 0;
  let totalMs = 0;
  if (this.sessions && this.sessions.length > 0) {
    this.sessions.forEach(session => {
      if (session.checkIn.time && session.checkOut.time) {
        const start = new Date(session.checkIn.time);
        const end = new Date(session.checkOut.time);
        const diffMs = end - start;
        const diffMins = diffMs / (1000 * 60);

        // Calculate decimal duration based on floored minutes to match H:M display
        const flooredMins = Math.floor(diffMins);
        session.duration = Number((flooredMins / 60).toFixed(2));
        session.durationString = formatDuration(diffMs);

        grossMins += diffMins;
        totalMs += diffMs;
      }
    });
  }

  const breakMins = this.breakTime || 0;
  const netMins = Math.max(0, grossMins - breakMins);

  // Calculate totalHours based on floored net minutes
  const flooredNetMins = Math.floor(netMins);
  this.totalHours = Number((flooredNetMins / 60).toFixed(2));

  // For totalDurationString, we use Net time (Gross - Breaks)
  const netMs = Math.max(0, totalMs - (breakMins * 60 * 1000));
  this.totalDurationString = formatDuration(netMs);

  // Calculate Break Durations
  if (this.breaks && this.breaks.length > 0) {
    this.breaks.forEach(brk => {
      if (brk.startTime && brk.endTime) {
        brk.durationString = formatDuration(new Date(brk.endTime) - new Date(brk.startTime));
      }
    });
  }
  this.totalBreakDurationString = formatDuration(breakMins * 60 * 1000);
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

console.log('--- MODEL LOAD: Attendance ---');
console.log('Host:', mongoose.connection.host);
console.log('DB:', mongoose.connection.name);

module.exports = Attendance;
