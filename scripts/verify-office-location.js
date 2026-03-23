const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'testapi@example.com';
const PASSWORD = 'TestPassword123!';

async function verifyOfficeLocation() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD,
        });

        const token = loginRes.data.data.accessToken;
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('\n--- Testing Office Locations ---');

        // 1. Create Location
        console.log('Creating location...');
        const createRes = await axios.post(`${API_URL}/office-locations`, {
            name: 'Bangalore Office - Test Report',
            address: {
                street: '123 Tech Park',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                zipCode: '560001'
            },
            contactInfo: {
                phone: '080-12345678',
                email: 'blr@example.com'
            },
            isHeadquarters: false
        }, config);
        const locationId = createRes.data.data.id || createRes.data.data._id;
        console.log('Location created:', createRes.data.data.name);

        // 2. Fetch all
        console.log('Fetching all locations...');
        const listRes = await axios.get(`${API_URL}/office-locations`, config);
        console.log(`Fetched ${listRes.data.data.length} locations`);

        // 3. Fetch by ID
        console.log('Fetching location by ID...');
        const getRes = await axios.get(`${API_URL}/office-locations/${locationId}`, config);
        console.log('Location fetched:', getRes.data.data.name);

        // 4. Update
        console.log('Updating location...');
        const updateRes = await axios.put(`${API_URL}/office-locations/${locationId}`, {
            contactInfo: {
                phone: '080-99999999'
            }
        }, config);
        console.log('Location updated:', updateRes.data.message);

        // 5. Toggle Status
        console.log('Toggling status to inactive...');
        const toggleRes = await axios.patch(`${API_URL}/office-locations/${locationId}/status`, {
            isActive: false
        }, config);
        console.log('Status toggled:', toggleRes.data.message);

        // 6. Delete
        console.log('Deleting location...');
        const deleteRes = await axios.delete(`${API_URL}/office-locations/${locationId}`, config);
        console.log('Location deleted successfully');

        console.log('\nAll Office Location tests passed successfully!');
        return true;
    } catch (error) {
        console.error('Office Location test failed:', JSON.stringify(error.response?.data || error.message, null, 2));
        return false;
    }
}

verifyOfficeLocation();
