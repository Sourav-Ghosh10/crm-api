require('dotenv').config();
const { connectDatabase } = require('../config/database');
const scheduleService = require('../services/scheduleService');
const leaveBalanceService = require('../services/leaveBalanceService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Override logger to console for immediate visibility
const runJobsManual = async () => {
    try {
        console.log('\n🚀 Starting Manual Job Execution...\n');
        
        // Connect to Database
        await connectDatabase();
        
        // Wait a bit for connection to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 1. Roster Generation
        console.log('📅 [Job 1/3] Starting daily roster generation...');
        await scheduleService.generateRostersForAllUsers();
        console.log('✅ Daily roster generation completed.');

        // 2. Monthly Leave Balance Reset
        console.log('\n📊 [Job 2/3] Starting monthly leave balance reset...');
        await leaveBalanceService.resetBalances('monthly');
        console.log('✅ Monthly leave balance reset completed.');

        // 3. Yearly Leave Balance Reset
        console.log('\n🗓️ [Job 3/3] Starting yearly leave balance reset...');
        await leaveBalanceService.resetBalances('yearly');
        console.log('✅ Yearly leave balance reset completed.');

        console.log('\n✨ All jobs finished successfully! ✨\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Manual Job Execution Failed ❌\n');
        console.error(error);
        process.exit(1);
    }
};

runJobsManual();
