require('dotenv').config();
const freshservice = require('./services/freshservice');

/**
 * Test script to verify Freshservice API integration for fetching ticket conversations
 * This tests the new getTicketConversations and getLatestTicketReply functions
 */

async function testFreshserviceAPI() {
    console.log('🧪 Testing Freshservice API Integration\n');

    // Test with a ticket ID (replace with actual ticket ID for real testing)
    const testTicketId = process.argv[2] || '12345';

    console.log(`📋 Testing with Ticket ID: ${testTicketId}\n`);

    // Test 1: Fetch all conversations
    console.log('Test 1: Fetching all conversations...');
    try {
        const conversations = await freshservice.getTicketConversations(testTicketId);
        console.log(`✅ Found ${conversations.length} conversations`);

        if (conversations.length > 0) {
            console.log('\nSample conversation:');
            console.log(JSON.stringify(conversations[0], null, 2));
        }
    } catch (error) {
        console.error('❌ Error fetching conversations:', error.message);
    }

    console.log('\n---\n');

    // Test 2: Get latest reply
    console.log('Test 2: Fetching latest reply...');
    try {
        const latestReply = await freshservice.getLatestTicketReply(testTicketId);

        if (latestReply) {
            console.log('✅ Latest reply found:');
            console.log('---');
            console.log(latestReply);
            console.log('---');
        } else {
            console.log('⚠️ No reply found');
        }
    } catch (error) {
        console.error('❌ Error fetching latest reply:', error.message);
    }

    console.log('\n🏁 Test complete');
}

testFreshserviceAPI().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
