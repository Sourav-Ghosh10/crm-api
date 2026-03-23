const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth/login';

const testLogin = async () => {
    try {
        console.log('Attempting login with demo credentials...');
        const response = await axios.post(API_URL, {
            email: 'demo@example.com',
            password: 'DemoUser123!',
        });

        if (response.status === 200 && response.data.success) {
            console.log('✅ Login Successful!');
            console.log('Access Token:', response.data.data.accessToken ? 'Received' : 'Missing');
            console.log('User:', response.data.data.user.personalInfo.email);
        } else {
            console.log('❌ Login Failed (Unexpected Status):', response.status);
        }
    } catch (error) {
        console.error('❌ Login Failed:', error.response ? error.response.data : error.message);
    }
};

testLogin();
