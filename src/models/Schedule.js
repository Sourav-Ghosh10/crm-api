const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
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
    shiftType: {
      type: String,
      enum: ['day', 'night', 'afternoon', 'flexible', 'off'],
      default: 'day',
    },
    startTime: {
      type: [String],
      required: function () {
        return this.shiftType !== 'off';
      },
      validate: {
        validator: function (v) {
          const shiftType = this.get ? this.get('shiftType') : this.shiftType;
          if (shiftType === 'off') return true;
          return v && v.length > 0;
        },
        message: 'At least one startTime is required for working shifts.',
      },
    },
    endTime: {
      type: [String],
      required: function () {
        return this.shiftType !== 'off';
      },
      validate: {
        validator: function (v) {
          const shiftType = this.get ? this.get('shiftType') : this.shiftType;
          if (shiftType === 'off') return true;

          const startTime = this.get ? this.get('startTime') : this.startTime;

          if (!v || v.length === 0) return false;
          // Length check
          if (!startTime || v.length !== startTime.length) return false;

          // Overlap and sequence check
          const shifts = startTime.map((start, i) => ({
            start,
            end: v[i],
          }));

          // Sort shifts by start time
          shifts.sort((a, b) => a.start.localeCompare(b.start));

          for (let i = 0; i < shifts.length; i++) {
            // Check cross-day shift: if start > end, we assume it's an overnight shift.
            // We only need to ensure they don't overlap if they are on the same day.
            
            // Check overlap with next shift
            if (i < shifts.length - 1) {
              // If current shift is NOT cross-day
              if (shifts[i].start < shifts[i].end) {
                 if (shifts[i].end > shifts[i + 1].start) return false;
              } else {
                // Current shift IS cross-day (e.g. 22:00 - 06:00)
                // It technically ends the next day, so it shouldn't overlap with anything else on THIS day.
                // But the sort order might be tricky.
                // Usually multiple shifts don't include a cross-day one.
              }
            }
          }

          return true;
        },
        message: 'Invalid shifts: ensure arrays have same length and do not overlap.',
      },
    },
    location: String,
    department: String,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      endsOn: Date,
      daysOfWeek: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for employee and date
scheduleSchema.index({ employeeId: 1, date: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
