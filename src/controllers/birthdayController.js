const User = require('../models/User');
const logger = require('../utils/logger');

const getMonthDay = (dateObj, timeZone = 'Asia/Kolkata') => {
  if (!dateObj) return null;
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'numeric',
      day: 'numeric'
    }).formatToParts(d);

    const month = parseInt(parts.find(p => p.type === 'month').value, 10);
    const day = parseInt(parts.find(p => p.type === 'day').value, 10);
    return { month, day };
  } catch {
    // Fallback to UTC if timezone error
    return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }
};

const birthdayController = {
  getUpcomingBirthdays: async (req, res, next) => {
    try {
      const currentUserId = req.user?.id || req.user?._id?.toString();
      const userTimezone = req.user?.employment?.timezone || 'Asia/Kolkata';

      // Current date in timezone
      const now = new Date();
      let curYear, curMonth, curDay;
      try {
        const currentParts = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        }).formatToParts(now);

        curYear = parseInt(currentParts.find(p => p.type === 'year').value, 10);
        curMonth = parseInt(currentParts.find(p => p.type === 'month').value, 10);
        curDay = parseInt(currentParts.find(p => p.type === 'day').value, 10);
      } catch {
        curYear = now.getFullYear();
        curMonth = now.getMonth() + 1;
        curDay = now.getDate();
      }

      // Find active users with dateOfBirth
      const users = await User.find(
        {
          isActive: true,
          'personalInfo.dateOfBirth': { $exists: true, $ne: null }
        },
        'personalInfo employment'
      ).lean();

      const todayBirthdays = [];
      const upcomingCandidates = [];
      let isTodayMyBirthday = false;
      let myDaysRemaining = null;
      let myNextBirthdayDate = null;

      users.forEach((u) => {
        const dob = u.personalInfo?.dateOfBirth;
        if (!dob) return;

        const bInfo = getMonthDay(dob, userTimezone);
        if (!bInfo) return;

        const { month: birthMonth, day: birthDay } = bInfo;

        // Calculate next birthday occurrence
        let targetYear = curYear;
        if (birthMonth < curMonth || (birthMonth === curMonth && birthDay < curDay)) {
          targetYear = curYear + 1;
        }

        // Handle leap year for Feb 29
        let safeDay = birthDay;
        if (birthMonth === 2 && birthDay === 29) {
          const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
          if (!isLeap) safeDay = 28;
        }

        const todayDate = new Date(Date.UTC(curYear, curMonth - 1, curDay));
        const nextBdayDate = new Date(Date.UTC(targetYear, birthMonth - 1, safeDay));
        const diffMs = nextBdayDate.getTime() - todayDate.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const nextBirthdayDateStr = nextBdayDate.toISOString().split('T')[0];

        const isCurrentUser = currentUserId && (u._id?.toString() === currentUserId.toString());

        const employeeData = {
          _id: u._id,
          firstName: u.personalInfo?.firstName || '',
          lastName: u.personalInfo?.lastName || '',
          fullName: `${u.personalInfo?.firstName || ''} ${u.personalInfo?.lastName || ''}`.trim(),
          department: u.employment?.department || '',
          designation: u.employment?.designation || '',
          dateOfBirth: dob,
          birthMonth,
          birthDay,
          nextBirthdayDate: nextBirthdayDateStr,
          daysRemaining,
          isCurrentUser
        };

        if (isCurrentUser) {
          myDaysRemaining = daysRemaining;
          myNextBirthdayDate = nextBirthdayDateStr;
          if (daysRemaining === 0) {
            isTodayMyBirthday = true;
          }
        }

        if (daysRemaining === 0) {
          todayBirthdays.push(employeeData);
        } else {
          upcomingCandidates.push(employeeData);
        }
      });

      // Sort upcoming by days remaining ascending
      upcomingCandidates.sort((a, b) => a.daysRemaining - b.daysRemaining);

      // Take within next 60 days, or at least the top 5 nearest upcoming
      let upcomingBirthdays = upcomingCandidates.filter(b => b.daysRemaining <= 60);
      if (upcomingBirthdays.length < 5 && upcomingCandidates.length > 0) {
        upcomingBirthdays = upcomingCandidates.slice(0, 5);
      }

      res.status(200).json({
        success: true,
        message: 'Upcoming birthdays fetched successfully',
        data: {
          todayDate: `${curYear}-${String(curMonth).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`,
          isTodayMyBirthday,
          myDaysRemaining,
          myNextBirthdayDate,
          todayBirthdays,
          upcomingBirthdays
        }
      });
    } catch (error) {
      logger.error('Error fetching upcoming birthdays:', error);
      next(error);
    }
  }
};

module.exports = birthdayController;
