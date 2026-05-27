const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const leaveController = require('../controllers/leaveController');
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');

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
});

describe('Leave Balance Logic', () => {
    test('should return blank string for totalAllocated and currentBalance if leave is unpaid', async () => {
        const user = await User.create({
            employeeId: 'EMP_BAL_TEST',
            username: 'balancetest',
            passwordHash: 'pass',
            personalInfo: { firstName: 'Balance', lastName: 'Test', email: 'balance@test.com' },
            employment: { department: 'IT', role: 'employee' }
        });

        await LeaveType.create({
            name: 'Unpaid Leave',
            code: 'LWP',
            defaultAmount: 0,
            isPaid: false,
            isActive: true,
            applicableDepartments: ['all']
        });

        await LeaveType.create({
            name: 'Paid Leave',
            code: 'PL',
            defaultAmount: 10,
            isPaid: true,
            isActive: true,
            applicableDepartments: ['all']
        });

        const req = {
            user: user,
            params: {}
        };
        const res = {
            json: jest.fn()
        };

        await leaveController.getLeaveBalance(req, res);

        const responseData = res.json.mock.calls[0][0].data;
        const balances = responseData.balances;

        const unpaidBalance = balances.find(b => b.code === 'LWP');
        const paidBalance = balances.find(b => b.code === 'PL');

        expect(unpaidBalance).toBeDefined();
        expect(unpaidBalance.currentBalance).toBe("");
        expect(unpaidBalance.totalAllocated).toBe("");

        expect(paidBalance).toBeDefined();
        expect(paidBalance.currentBalance).toBe(10);
        expect(paidBalance.totalAllocated).toBe(10);
    });
});
