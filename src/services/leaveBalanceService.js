const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const logger = require('../utils/logger');

/**
 * Service to handle dynamic leave balance resets and carry-forward logic.
 */
const leaveBalanceService = {
    /**
     * Resets balances for a specific leave type across all eligible users.
     * @param {string} frequency - 'monthly' or 'yearly'
     */
    resetBalances: async (frequency) => {
        try {
            logger.info(`Starting ${frequency} leave balance reset...`);

            // 1. Fetch all active leave types matching this frequency
            const activeTypes = await LeaveType.find({
                isActive: true,
                resetFrequency: frequency
            });

            if (activeTypes.length === 0) {
                logger.info(`No active leave types found for ${frequency} reset.`);
                return;
            }

            for (const leaveType of activeTypes) {
                const leaveTypeKey = leaveType.code.toLowerCase();

                // 2. Find users applicable for this leave type
                // If applicableDepartments is ['all'], we target everyone
                let userQuery = { isActive: true };
                if (!leaveType.applicableDepartments.includes('all')) {
                    userQuery['employment.department'] = { $in: leaveType.applicableDepartments };
                }

                const users = await User.find(userQuery);

                for (const user of users) {
                    const currentBalance = user.leaveBalance.get(leaveTypeKey) || 0;

                    // 3. Apply carry forward logic
                    // New Balance = Min(Current, MaxCarryForward) + DefaultAnnualAmount
                    const carryForwardAmount = Math.min(currentBalance, leaveType.maxCarryForward || 0);
                    const newBalance = carryForwardAmount + (leaveType.defaultAmount || 0);

                    user.leaveBalance.set(leaveTypeKey, newBalance);
                    await user.save();
                }

                logger.info(`Reset complete for leave type: ${leaveType.code}`);
            }

            logger.info(`${frequency.charAt(0).toUpperCase() + frequency.slice(1)} reset cycle completed successfully.`);
        } catch (error) {
            logger.error(`Error during ${frequency} leave balance reset:`, error);
            throw error;
        }
    }
};

module.exports = leaveBalanceService;
