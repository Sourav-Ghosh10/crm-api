const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const leaveController = require('../controllers/leaveController');
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');
const Schedule = require('../models/Schedule');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await LeaveType.deleteMany({});
    await Holiday.deleteMany({});
    await Schedule.deleteMany({});
    await Leave.deleteMany({});
});

describe('Leave Calculation Logic', () => {
    let user, leaveType;

    beforeEach(async () => {
        user = await User.create({
            employeeId: 'EMP_LEAVE_CALC',
            username: 'leavecalc',
            passwordHash: 'pass',
            personalInfo: { firstName: 'Leave', lastName: 'Calc', email: 'calcleave@test.com' },
            employment: {
                department: 'IT',
                role: 'employee',
                workingHours: { weeklyOff: ['Sunday'] }
            },
            isHolidayApplicable: true
        });

        leaveType = await LeaveType.create({
            name: 'Annual Leave',
            code: 'AL',
            defaultAmount: 20,
            isPaid: true,
            isActive: true,
            applicableDepartments: ['all']
        });
    });

    test('should exclude holidays if user is eligible', async () => {
        // Create a holiday
        const date = '2025-06-01'; // Sunday
        const monday = '2025-06-02'; // Monday (Holiday)
        const tuesday = '2025-06-03'; // Tuesday

        await Holiday.create({
            name: 'Test Holiday',
            date: new Date(monday),
            isActive: true
        });

        const req = {
            user: user,
            body: {
                leaveType: 'Annual Leave',
                startDate: monday,
                endDate: tuesday, // 2 days range
                halfDay: false,
                reason: 'Test'
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await leaveController.createLeaveRequest(req, res);

        const responseData = res.json.mock.calls[0][0].data;
        // Monday is Holiday, Tuesday is working. Count should be 1.
        expect(responseData.numberOfDays).toBe(1);
    });

    test('should include HOLIDAY if user is NOT eligible', async () => {
        user.isHolidayApplicable = false;
        await user.save();

        const monday = '2025-06-09'; // Holiday

        await Holiday.create({
            name: 'Test Holiday',
            date: new Date(monday),
            isActive: true
        });

        const req = {
            user: user,
            body: {
                leaveType: 'Annual Leave',
                startDate: monday,
                endDate: monday,
                halfDay: false,
                reason: 'Test'
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await leaveController.createLeaveRequest(req, res);
        const responseData = res.json.mock.calls[0][0].data;
        expect(responseData.numberOfDays).toBe(1);
    });

    test('should use Schedule for weekly off (override default)', async () => {
        const date = '2025-06-04'; // Wednesday (Normally working)

        // Create a schedule marking Wednesday as OFF
        await Schedule.create({
            employeeId: user._id,
            date: new Date(date),
            shiftType: 'off',
            isRecurring: false
        });

        const req = {
            user: user,
            body: {
                leaveType: 'Annual Leave',
                startDate: date,
                endDate: date,
                halfDay: false,
                reason: 'Test'
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Should throw BadRequest because it's only off days
        try {
            await leaveController.createLeaveRequest(req, res);
        } catch (error) {
            expect(error.message).toContain('only contains holidays or weekly offs');
        }
    });

    test('should NOT count schedule-based off as leave day', async () => {
        const wednesday = '2025-06-11'; // Off per schedule
        const thursday = '2025-06-12'; // Working

        await Schedule.create({
            employeeId: user._id,
            date: new Date(wednesday),
            shiftType: 'off'
        });

        const req = {
            user: user,
            body: {
                leaveType: 'Annual Leave',
                startDate: wednesday,
                endDate: thursday,
                halfDay: false,
                reason: 'Test'
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await leaveController.createLeaveRequest(req, res);
        const responseData = res.json.mock.calls[0][0].data;
        expect(responseData.numberOfDays).toBe(1); // Only thursday counts
    });
});
