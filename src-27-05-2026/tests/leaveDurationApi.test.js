const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const leaveController = require('../controllers/leaveController');
const User = require('../models/User');
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
    await Holiday.deleteMany({});
    await Schedule.deleteMany({});
});

describe('Calculate Leave Days API', () => {
    let user;

    beforeEach(async () => {
        user = await User.create({
            employeeId: 'EMP_CALC_API',
            username: 'calcapi',
            passwordHash: 'pass',
            personalInfo: { firstName: 'Calc', lastName: 'Api', email: 'calcapi@test.com' },
            employment: {
                department: 'IT',
                role: 'employee',
                workingHours: { weeklyOff: ['Sunday'] }
            },
            isHolidayApplicable: true
        });
    });

    test('should calculate days correctly via API controller', async () => {
        const startDate = '2025-07-01'; // Tuesday
        const endDate = '2025-07-03'; // Thursday

        const req = {
            user: user,
            query: {
                startDate,
                endDate,
                halfDay: 'false'
            }
        };
        const res = {
            json: jest.fn()
        };

        await leaveController.calculateLeaveDuration(req, res);

        const responseData = res.json.mock.calls[0][0].data;
        expect(responseData.numberOfDays).toBe(3);
    });

    test('should exclude holidays if applicable', async () => {
        const startDate = '2025-07-04'; // Friday (Holiday)

        await Holiday.create({
            name: 'Independence Day',
            date: new Date(startDate),
            isActive: true
        });

        const req = {
            user: user,
            query: {
                startDate,
                endDate: startDate,
                halfDay: 'false'
            }
        };
        const res = {
            json: jest.fn()
        };

        await leaveController.calculateLeaveDuration(req, res);
        const responseData = res.json.mock.calls[0][0].data;
        expect(responseData.numberOfDays).toBe(0);
    });

    test('should populate numberOfDays correctly when halfDay is "false" string', async () => {
        const startDate = '2026-01-09';
        const endDate = '2026-01-16'; // 8 days

        const req = {
            user: user,
            query: {
                startDate,
                endDate,
                halfDay: 'false' // Simulating query param string
            }
        };
        const res = {
            json: jest.fn()
        };

        await leaveController.calculateLeaveDuration(req, res);
        const responseData = res.json.mock.calls[0][0].data;

        // Should be around ~7 or 8 days depending on weekly offs, but definitely not 0.5
        expect(responseData.numberOfDays).toBeGreaterThan(0.5);
    });

    test('should return 0.5 when halfDay is "true" string', async () => {
        const startDate = '2026-01-09';

        const req = {
            user: user,
            query: {
                startDate,
                endDate: startDate,
                halfDay: 'true'
            }
        };
        const res = {
            json: jest.fn()
        };

        await leaveController.calculateLeaveDuration(req, res);
        const responseData = res.json.mock.calls[0][0].data;
        expect(responseData.numberOfDays).toBe(0.5);
    });
});
