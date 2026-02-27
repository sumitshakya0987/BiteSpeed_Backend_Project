const axios = require('axios');

const BASE_URL = 'https://bitespeed-backend-project-zsh6.onrender.com';

async function testIdentify(payload) {
    try {
        const response = await axios.post(`${BASE_URL}/identify`, payload);
        console.log(`Request: ${JSON.stringify(payload)}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        console.log('---');
    } catch (error) {
        console.error(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
}

async function runTests() {
    console.log('Starting Identity Reconciliation Tests...\n');

    // 1. New user: Lorraine
    await testIdentify({
        email: "lorraine@hillvalley.edu",
        phoneNumber: "123456"
    });

    // 2. Existing user (matched by phone): McFly
    await testIdentify({
        email: "mcfly@hillvalley.edu",
        phoneNumber: "123456"
    });

    // 3. New primary user: George
    await testIdentify({
        email: "george@hillvalley.edu",
        phoneNumber: "919191"
    });

    // 4. New primary user: Biff
    await testIdentify({
        email: "biffsucks@hillvalley.edu",
        phoneNumber: "717171"
    });

    // 5. Merge George and Biff
    await testIdentify({
        email: "george@hillvalley.edu",
        phoneNumber: "717171"
    });
}

runTests();
