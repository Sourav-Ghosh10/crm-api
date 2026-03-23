const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runVerification = async () => {
    try {
        console.log('Starting verification...');

        // 1. Login
        console.log('\n--- Testing Login ---');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            username: 'demouser',
            password: 'DemoUser123!',
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
        } else {
            console.error('❌ Login failed');
            process.exit(1);
        }

        const { accessToken, user } = loginResponse.data.data;
        console.log(`Logged in as: ${user.username} (${user.employment.role})`);

        // 2. Create User
        console.log('\n--- Testing User Creation ---');
        const newUser = {
            employeeId: 'EMP' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
            username: 'testuser' + Math.floor(Math.random() * 1000),
            password: 'TestUser123!',
            personalInfo: {
                firstName: 'Test',
                lastName: 'User',
                email: `test${Math.floor(Math.random() * 1000)}@example.com`,
            },
            employment: {
                role: 'employee',
                department: 'Engineering',
                employmentType: 'full-time',
            },
        };

        const createResponse = await axios.post(`${API_URL}/users`, newUser, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (createResponse.data.success) {
            console.log('✅ User creation successful');
            console.log('Created user ID:', createResponse.data.data._id);
        } else {
            console.error('❌ User creation failed');
        }

        // 3. Get Users
        console.log('\n--- Testing Get Users ---');
        const getUsersResponse = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (getUsersResponse.data.success) {
            console.log('✅ Get users successful');
            console.log('Total users:', getUsersResponse.data.pagination.total);
        } else {
            console.error('❌ Get users failed');
        }

        console.log('\nVerification completed successfully!');
        process.exit(0);

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Network/Script Error:', error.message);
        }
        process.exit(1);
    }
};

// Wait for server to start (simple delay for this script)
setTimeout(runVerification, 2000);
