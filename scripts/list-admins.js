require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');

const listAdmins = async () => {
    try {
        await connectDatabase();
        const admins = await User.find({ 'employment.role': 'admin' }, 'username personalInfo.email').lean();
        admins.forEach(admin => {
            console.log(`Username: ${admin.username}, Email: ${admin.personalInfo.email}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error listing admins:', error);
        process.exit(1);
    }
};

listAdmins();
