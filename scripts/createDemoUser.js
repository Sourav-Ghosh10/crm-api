require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { connectDatabase } = require('../src/config/database');

const createDemoUser = async () => {
    try {
        await connectDatabase();

        const demoUser = {
            employeeId: 'EMP001',
            username: 'demouser',
            // Pass plain password to passwordHash, let model pre-save hook hash it
            passwordHash: 'DemoUser123!',
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
        };

        console.log('Checking for existing users...');
        // Check if user exists by username, email, or employeeId
        const existingUser = await User.findOne({
            $or: [
                { username: demoUser.username },
                { 'personalInfo.email': demoUser.personalInfo.email },
                { employeeId: demoUser.employeeId },
            ]
        });

        if (existingUser) {
            console.log('Demo user already exists (found match by username, email, or employeeId)');
            console.log(`Existing user ID: ${existingUser._id}`);
            process.exit(0);
        }

        console.log('Creating user...', JSON.stringify(demoUser, null, 2));

        // Create user
        try {
            const user = await User.create(demoUser);
            console.log('Demo user created successfully');
            console.log('User ID:', user._id);
            process.exit(0);
        } catch (createError) {
            console.error('Error during User.create:');
            console.error(JSON.stringify(createError, null, 2));
            // Also print stack
            console.error(createError);
            process.exit(1);
        }

    } catch (error) {
        console.error('General Error creating demo user:', error);
        process.exit(1);
    }
};

createDemoUser();
