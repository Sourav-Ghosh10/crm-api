require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');

const resetPassword = async () => {
    try {
        await connectDatabase();
        const user = await User.findOne({ 'personalInfo.email': 'reshab@hashtagbizsolutions.com' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }
        user.passwordHash = 'DemoUser123!';
        await user.save();
        console.log('Password reset successfully for reshab@hashtagbizsolutions.com');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetPassword();
