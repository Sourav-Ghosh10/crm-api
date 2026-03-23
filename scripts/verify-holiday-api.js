const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'demo@example.com';
const PASSWORD = 'DemoUser123!';

async function verifyHoliday() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'reshab@hashtagbizsolutions.com',
            password: PASSWORD,
        });

        const token = loginRes.data.data.accessToken;
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('\n--- Testing Holiday API ---');

        // 1. Create Holiday
        console.log('Creating holiday...');
        const createRes = await axios.post(`${API_URL}/holidays`, {
            name: 'Christmas Eve - Test',
            date: '2025-12-24',
            description: 'Day before Christmas',
            isRecurring: true,
            isActive: true
        }, config);
        const holidayId = createRes.data.data.id || createRes.data.data._id;
        console.log('Holiday created:', createRes.data.data.name);

        // 2. Fetch all
        console.log('Fetching all holidays...');
        const listRes = await axios.get(`${API_URL}/holidays`, config);
        console.log(`Fetched ${listRes.data.data.length} holidays`);

        // 3. Fetch by ID
        console.log('Fetching holiday by ID...');
        const getRes = await axios.get(`${API_URL}/holidays/${holidayId}`, config);
        console.log('Holiday fetched:', getRes.data.data.name);

        // 4. Update
        console.log('Updating holiday...');
        const updateRes = await axios.put(`${API_URL}/holidays/${holidayId}`, {
            description: 'Updated description for Christmas Eve'
        }, config);
        console.log('Holiday updated:', updateRes.data.message);

        // 5. Toggle Status
        console.log('Toggling status to inactive...');
        const toggleRes = await axios.patch(`${API_URL}/holidays/${holidayId}/status`, {
            isActive: false
        }, config);
        console.log('Status toggled:', toggleRes.data.message);

        // 6. Delete
        console.log('Deleting holiday...');
        const deleteRes = await axios.delete(`${API_URL}/holidays/${holidayId}`, config);
        console.log('Holiday deleted successfully');

        console.log('\nAll Holiday API tests passed successfully!');
        return true;
    } catch (error) {
        console.error('Holiday API test failed:', JSON.stringify(error.response?.data || error.message, null, 2));
        return false;
    }
}

verifyHoliday();
