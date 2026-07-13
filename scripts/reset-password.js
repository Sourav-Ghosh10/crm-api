require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');

const resetPassword = async () => {
    try {
        await connectDatabase();
        const identifier = process.argv[2] || '';
        const newPassword = process.argv[3] || '';

        const user = await User.findOne({
            $or: [
                { username: identifier },
                { 'personalInfo.email': identifier }
            ]
        });

        if (!user) {
            console.log(`User not found for identifier: ${identifier}`);
            process.exit(1);
        }

        user.passwordHash = newPassword;
        await user.save();
        console.log(`Password reset successfully for ${user.username} (${user.personalInfo.email})`);
        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetPassword();
