const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'testapi@example.com';
const PASSWORD = 'TestPassword123!';

async function verifyInactiveLogin() {
    try {
        console.log('Logging in to get token for deactivation...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD,
        });

        const token = loginRes.data.data.accessToken;
        const userId = loginRes.data.data.user.id || loginRes.data.data.user._id;
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('Deactivating user...');
        await axios.delete(`${API_URL}/users/${userId}?isActive=false`, config);
        console.log('User deactivated.');

        console.log('\nAttempting to log in with inactive user...');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: EMAIL,
                password: PASSWORD,
            });
            console.log('Error: Login should have failed but succeeded.');
        } catch (error) {
            console.log('Login failed as expected.');
            const msg = error.response?.data?.error?.message || error.response?.data?.message;
            console.log('Status:', error.response?.status);
            console.log('Message:', msg);

            if (msg === 'Your account is currently inactive. Please contact the administrator.') {
                console.log('SUCCESS: Correct error message received.');
            } else {
                console.log('FAILURE: Unexpected error message.');
            }
        }

        // Re-activate
        console.log('\nRe-activating user...');
        // We'll use a direct DB script here because deactivation might have invalidated the token 
        // depending on how strictly the middleware/redis handles it.
        require('child_process').execSync(`node -e "const mongoose = require('mongoose'); const User = require('./src/models/User'); mongoose.connect('mongodb+srv://pulse-ops:Pulse-ops!@pulse-ops.l42bqtt.mongodb.net/pulse-ops-test').then(async () => { await User.findOneAndUpdate({ 'personalInfo.email': '${EMAIL}' }, { isActive: true }); process.exit(0); })"`);
        console.log('User re-activated successfully!');

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

verifyInactiveLogin();
