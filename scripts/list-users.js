require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');

const listUsers = async () => {
    try {
        await connectDatabase();
        const users = await User.find({}, 'username personalInfo.firstName personalInfo.lastName personalInfo.email employment.role isActive').lean();
        console.log('Users in database:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }
};

listUsers();
