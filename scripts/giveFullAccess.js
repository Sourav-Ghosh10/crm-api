require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = 'souravghoshmgu1@gmail.com';

const ALL_PERMISSIONS = [
    'employee_view', 'employee_create', 'employee_edit', 'employee_delete',
    'attendance_view', 'attendance_edit',
    'schedule_view', 'schedule_manage',
    'leave_view', 'leave_approve', 'leave_reject',
    'reimbursement_view', 'reimbursement_approve', 'reimbursement_reject', 'reimbursement_pay',
    'announcement_view', 'announcement_create', 'announcement_edit', 'announcement_delete',
    'department_view', 'department_manage',
    'designation_view', 'designation_manage',
    'location_view', 'location_manage',
    'holiday_view', 'holiday_manage',
    'leave_type_manage', 'leave_balance_manage',
    'reimbursement_type_manage',
    'role_view', 'role_manage',
    'report_view',
    'client_view', 'client_manage',
    'view_user_location_history',
    'dashboard_view',
    'incident_view', 'incident_create', 'incident_manage',
    'support_view', 'support_manage'
];

async function giveFullAccess() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log(`Finding user with email: ${email}`);
        const user = await User.findOne({ 'personalInfo.email': email });

        if (!user) {
            console.error('User not found!');
            process.exit(1);
        }

        console.log('Found user:', user.username);
        
        // Update user fields
        user.isAdmin = true;
        user.employment.role = 'admin';
        user.permissions = {
            modules: ALL_PERMISSIONS,
            canApproveLeave: true,
            canApproveReimbursement: true,
            canManageSchedule: true,
            canViewReports: true
        };

        await user.save();
        console.log('Successfully updated user permissions and given full access.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

giveFullAccess();
