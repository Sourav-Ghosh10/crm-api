require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { connectDatabase } = require('../src/config/database');

const checkUser = async () => {
    try {
        await connectDatabase();
        console.log('Connected. Checking for demouser...');
        const user = await User.findOne({ username: 'demouser' });
        if (user) {
            console.log('User FOUND:', user.username, user._id);
            process.exit(0);
        } else {
            console.log('User NOT FOUND');
            process.exit(1);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUser();
