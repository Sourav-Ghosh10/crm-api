require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../src/config/database');

const forceCreateUser = async () => {
    try {
        await connectDatabase();

        const passwordHash = await bcrypt.hash('DemoUser123!', 12);

        const demoUser = {
            employeeId: 'EMP001',
            username: 'demouser',
            passwordHash: passwordHash,
            personalInfo: {
                firstName: 'Demo',
                lastName: 'User',
                email: 'demo@example.com',
                phone: '1234567890',
            },
            employment: {
                role: 'admin',
                department: 'IT',
                designation: 'System Administrator',
                dateOfJoining: new Date(),
                employmentType: 'full-time',
            },
            isActive: true,
            lastLogin: null,
            failedLoginAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        };

        console.log('Force creating user...');

        // Use native mongo collection to bypass mongoose hooks/validation if needed
        // But we need the collection name. Usually 'users'.
        const hasUser = await mongoose.connection.collection('users').findOne({ username: 'demouser' });
        if (hasUser) {
            console.log('User already exists');
            process.exit(0);
        }

        await mongoose.connection.collection('users').insertOne(demoUser);

        console.log('Demo user created successfully (forced)');
        process.exit(0);
    } catch (error) {
        console.error('Error forcing demo user:', error);
        process.exit(1);
    }
};

forceCreateUser();
