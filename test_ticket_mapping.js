const ticketUserMap = require('./services/ticketUserMap');

/**
 * Test script to verify ticket-user mapping with ticket types
 * This tests the enhanced storeMapping function with sensitivity tracking
 */

console.log('🧪 Testing Ticket-User Mapping Service\n');

// Test data
const testMappings = [
    { ticketId: 'TEST-001', userId: 'U12345', channelId: 'D12345', ticketType: 'domain_lock' },
    { ticketId: 'TEST-002', userId: 'U67890', channelId: 'D67890', ticketType: 'password_reset' },
    { ticketId: 'TEST-003', userId: 'UABCDE', channelId: 'DABCDE', ticketType: 'general' },
    { ticketId: 'TEST-004', userId: 'UFGHIJ', channelId: 'DFGHIJ', ticketType: 'vpn_issue' }
];

// Store test mappings
console.log('📝 Storing test mappings...\n');
testMappings.forEach(mapping => {
    ticketUserMap.storeMapping(
        mapping.ticketId,
        mapping.userId,
        mapping.channelId,
        mapping.ticketType
    );
});

console.log('\n---\n');

// Retrieve and verify mappings
console.log('🔍 Retrieving and verifying mappings...\n');
testMappings.forEach(original => {
    const retrieved = ticketUserMap.getMapping(original.ticketId);

    console.log(`Ticket: ${original.ticketId}`);
    console.log(`  Type: ${retrieved.ticketType}`);
    console.log(`  Sensitive: ${retrieved.isSensitive ? '🔐 YES' : '📋 NO'}`);
    console.log(`  User: ${retrieved.userId}`);
    console.log(`  Channel: ${retrieved.channelId}`);
    console.log();
});

// Verify sensitive ticket detection
console.log('---\n');
console.log('✅ Verification Summary:\n');

const domainLockMapping = ticketUserMap.getMapping('TEST-001');
const passwordResetMapping = ticketUserMap.getMapping('TEST-002');
const generalMapping = ticketUserMap.getMapping('TEST-003');

console.log(`Domain Lock ticket marked as sensitive: ${domainLockMapping.isSensitive ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Password Reset ticket marked as sensitive: ${passwordResetMapping.isSensitive ? '✅ PASS' : '❌ FAIL'}`);
console.log(`General ticket NOT marked as sensitive: ${!generalMapping.isSensitive ? '✅ PASS' : '❌ FAIL'}`);

console.log('\n🏁 Test complete');
