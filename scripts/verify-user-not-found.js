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
            if (error.response.status === 404 && error.response.data.error.message === 'User not found') {
                console.log('✅ Success: Received 404 User not found');
            } else {
                console.log('❌ Failed: Unexpected error response');
                console.log('Status:', error.response.status);
                console.log('Message:', error.response.data.error ? error.response.data.error.message : error.response.data);
            }
        } else {
            console.error('❌ Error:', error.message);
        }
    }
};

testUserNotFound();
