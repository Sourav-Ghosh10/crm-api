const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth/login';

const testUserNotFound = async () => {
    try {
        console.log('Testing login with non-existent user...');
        await axios.post(API_URL, {
            email: 'nonexistent@example.com',
            password: 'SomePassword123!',
        });
        console.log('❌ Failed: Should have thrown an error');
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 401 && error.response.data.error.code === 'UNAUTHORIZED') {
                console.log('✅ Success: Received 401 UNAUTHORIZED as expected');
            } else {
                console.log('❌ Failed: Expected 401 UNAUTHORIZED');
            }
        } else {
            console.error('❌ Error:', error.message);
        }
    }
};

testUserNotFound();
