const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const scheduleService = require('../services/scheduleService');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');
const moment = require('moment');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await Schedule.deleteMany({});
    await Holiday.deleteMany({});
    await Leave.deleteMany({});
});

describe('Roster Integration Tests', () => {
    let user;

    beforeEach(async () => {
        user = await User.create({
            employeeId: 'EMP001',
            username: 'testuser',
            passwordHash: 'hashedpassword', // Bypass hashing hook if possible or let it run
            personalInfo: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            },
            employment: {
                role: 'employee'
            },
            isHolidayApplicable: true
        });
    });

    test('should show Holiday in roster when user is eligible', async () => {
        const date = moment().add(1, 'days').format('YYYY-MM-DD');

        await Holiday.create({
            name: 'Test Holiday',
            date: new Date(date),
            isActive: true
        });

        // Generate roster
        const roster = await scheduleService.getEmployeeRoster(user._id, date, date);
        const dayData = roster.shiftData[date];

        expect(dayData).toBeDefined();
        expect(dayData.shiftType).toBe('Holiday');
        expect(dayData.holidayName).toBe('Test Holiday');
    });

    test('should NOT show Holiday in roster when user is NOT eligible', async () => {
        // Update user to not have holidays applicable
        user.isHolidayApplicable = false;
        await user.save();

        const date = moment().add(1, 'days').format('YYYY-MM-DD');

        await Holiday.create({
            name: 'Test Holiday',
            date: new Date(date),
            isActive: true
        });

        // Generate roster
        const roster = await scheduleService.getEmployeeRoster(user._id, date, date);
        const dayData = roster.shiftData[date];

        expect(dayData).toBeDefined();
        expect(dayData.shiftType).not.toBe('Holiday');
    });

    test('should show Leave in roster when user has approved leave', async () => {
        const date = moment().add(2, 'days').format('YYYY-MM-DD');

        await Leave.create({
            employeeId: user._id,
            leaveType: 'sick',
            startDate: new Date(date),
            endDate: new Date(date),
            numberOfDays: 1,
            reason: 'Sick Leave',
            status: 'approved'
        });

        const roster = await scheduleService.getEmployeeRoster(user._id, date, date);
        const dayData = roster.shiftData[date];

        expect(dayData).toBeDefined();
        expect(dayData.shiftType).toBe('Leave');
        expect(dayData.leaveType).toBe('sick');
    });

    test('should prioritize Leave over Holiday', async () => {
        const date = moment().add(3, 'days').format('YYYY-MM-DD');

        // Create both Holiday and Leave for the same day
        await Holiday.create({
            name: 'Clash Holiday',
            date: new Date(date),
            isActive: true
        });

        await Leave.create({
            employeeId: user._id,
            leaveType: 'casual',
            startDate: new Date(date),
            endDate: new Date(date),
            numberOfDays: 1,
            reason: 'Personal',
            status: 'approved'
        });

        const roster = await scheduleService.getEmployeeRoster(user._id, date, date);
        const dayData = roster.shiftData[date];

        expect(dayData).toBeDefined();
        expect(dayData.shiftType).toBe('Leave'); // Priority check
        expect(dayData.leaveType).toBe('casual');
    });

    test('should handle getAllEmployeesRosters with Holiday and Leave', async () => {
        const date = moment().add(4, 'days').format('YYYY-MM-DD');

        await Holiday.create({
            name: 'Global Holiday',
            date: new Date(date),
            isActive: true
        });

        // Create another user with Leave
        const user2 = await User.create({
            employeeId: 'EMP002',
            username: 'user2',
            passwordHash: 'pass',
            personalInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
            isHolidayApplicable: true
        });

        await Leave.create({
            employeeId: user2._id,
            leaveType: 'sick',
            startDate: new Date(date),
            endDate: new Date(date),
            numberOfDays: 1,
            reason: 'Sick',
            status: 'approved'
        });

        const result = await scheduleService.getAllEmployeesRosters({
            startDate: date,
            endDate: date,
            page: 1,
            limit: 10
        });

        const user1Data = result.data.find(u => u._id.toString() === user._id.toString());
        const user2Data = result.data.find(u => u._id.toString() === user2._id.toString());

        expect(user1Data.shiftData[date].shiftType).toBe('Holiday');
        expect(user2Data.shiftData[date].shiftType).toBe('Leave');
    });
});
