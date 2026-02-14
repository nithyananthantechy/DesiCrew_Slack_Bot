require('dotenv').config();
const express = require('express');

/**
 * Test webhook payload sender
 * Simulates Freshservice sending webhook notifications to test the webhook handler
 */

const PORT = 3000;
const WEBHOOK_URL = `http://localhost:${PORT}/freshservice/webhook`;

// Sample webhook payloads
const samplePayloads = {
    domainLock: {
        ticket: {
            id: 'TEST-001',
            ticket_id: 'TEST-001',
            subject: 'Domain Lock - DC5365',
            status: 4,
            status_name: 'Resolved',
            priority: 1,
            description_text: 'User request: Domain lock',
            latest_note: 'Thank you for reaching out to DC IT Helpdesk. DOMAIN ACCOUNT STATUS CHECKED: Employee ID: DC5365 - Account Name: Nithyananthan - Status: Account was locked. The account is now active and ready for login.',
            responder_name: 'Automation System',
            updated_by: 'Automation'
        }
    },
    passwordReset: {
        ticket: {
            id: 'TEST-002',
            ticket_id: 'TEST-002',
            subject: 'Password Reset - EMP789',
            status: 4,
            status_name: 'Resolved',
            priority: 1,
            description_text: 'User request: Password reset',
            latest_note: 'Password has been reset successfully. Your temporary password is: TempPass123! Please change it on first login.',
            responder_name: 'Password Reset Bot',
            updated_by: 'Automation'
        }
    },
    general: {
        ticket: {
            id: 'TEST-003',
            ticket_id: 'TEST-003',
            subject: 'VPN Connection Issue',
            status: 2,
            status_name: 'Open',
            priority: 2,
            description_text: 'Cannot connect to VPN',
            latest_note: 'Our team is looking into your VPN issue. We will update you shortly.',
            responder_name: 'IT Support',
            updated_by: 'John Doe'
        }
    }
};

async function sendTestWebhook(payloadType) {
    const axios = require('axios');
    const payload = samplePayloads[payloadType];

    if (!payload) {
        console.error(`❌ Unknown payload type: ${payloadType}`);
        console.log(`Available types: ${Object.keys(samplePayloads).join(', ')}`);
        return;
    }

    console.log(`\n📤 Sending ${payloadType} webhook payload to ${WEBHOOK_URL}\n`);
    console.log('Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n---\n');

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Response:', response.status, response.statusText);
        console.log('Response data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Error response:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Command-line usage
const payloadType = process.argv[2] || 'domainLock';

console.log('🧪 Webhook Test Utility\n');
console.log('Usage: node test_webhook_payload.js [payloadType]');
console.log(`Available types: ${Object.keys(samplePayloads).join(', ')}`);
console.log(`\nTesting with: ${payloadType}\n`);

// Wait a bit to ensure the main app is running
setTimeout(() => {
    sendTestWebhook(payloadType).then(() => {
        console.log('\n🏁 Test complete');
    });
}, 1000);
