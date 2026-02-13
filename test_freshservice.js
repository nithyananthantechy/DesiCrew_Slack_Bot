require('dotenv').config();
const axios = require('axios');

async function test() {
    const domain = "desicrew.freshservice.com";
    const apiKey = "QlRPOby1GBAPxBAthIAW";
    const auth = Buffer.from(apiKey + ':X').toString('base64');

    const urls = [
        `https://${domain}/api/v2/tickets`,
        `https://${domain}/api/v2/ticket_fields`,
        `https://${domain}/api/v2/agents/me`
    ];

    for (const url of urls) {
        console.log(`Testing ${url}...`);
        try {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            console.log(`✅ Success! Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ Failed: ${url} - Status: ${error.response ? error.response.status : error.message}`);
        }
    }
}

test();
