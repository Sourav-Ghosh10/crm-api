const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reimbursementService = require('../services/reimbursementService');
const User = require('../models/User');
const Reimbursement = require('../models/Reimbursement');
const { REIMBURSEMENT_STATUS, REIMBURSEMENT_TYPES, PAYMENT_MODES } = require('../config/constants');

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
    await Reimbursement.deleteMany({});
});

describe('Reimbursement Module', () => {
    let employee, manager;

    beforeEach(async () => {
        employee = await User.create({
            employeeId: 'EMP001',
            username: 'employee1',
            passwordHash: 'hashedpassword',
            personalInfo: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            employment: { role: 'employee' }
        });

        manager = await User.create({
            employeeId: 'MGR001',
            username: 'manager1',
            passwordHash: 'hashedpassword',
            personalInfo: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
            employment: { role: 'manager' }
        });
    });

    test('should create a reimbursement request', async () => {
        const data = {
            reimbursementType: REIMBURSEMENT_TYPES.TRAVEL,
            title: 'Business Trip',
            amount: 100,
            expenseDate: new Date(),
            description: 'Trip to Tokyo'
        };

        const request = await reimbursementService.createRequest(employee._id, data);

        expect(request.employeeId.toString()).toBe(employee._id.toString());
        expect(request.status).toBe(REIMBURSEMENT_STATUS.PENDING);
        expect(request.amount).toBe(100);
    });

    test('should approve a reimbursement request', async () => {
        const request = await Reimbursement.create({
            employeeId: employee._id,
            reimbursementType: REIMBURSEMENT_TYPES.FOOD,
            title: 'Team Lunch',
            amount: 50,
            expenseDate: new Date()
        });

        const updated = await reimbursementService.updateStatus(request._id, manager._id, {
            status: REIMBURSEMENT_STATUS.APPROVED,
            remarks: 'Looks good'
        });

        expect(updated.status).toBe(REIMBURSEMENT_STATUS.APPROVED);
        expect(updated.approval.approvedBy.toString()).toBe(manager._id.toString());
    });

    test('should mark as paid after approval', async () => {
        const request = await Reimbursement.create({
            employeeId: employee._id,
            reimbursementType: REIMBURSEMENT_TYPES.MEDICAL,
            title: 'Checkup',
            amount: 200,
            expenseDate: new Date(),
            status: REIMBURSEMENT_STATUS.APPROVED
        });

        const paid = await reimbursementService.markAsPaid(request._id, {
            paidAmount: 200,
            paymentMode: PAYMENT_MODES.UPI,
            transactionId: 'TXN123'
        });

        expect(paid.status).toBe(REIMBURSEMENT_STATUS.PAID);
        expect(paid.payment.transactionId).toBe('TXN123');
    });
});
