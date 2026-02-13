const aiService = require('./services/aiService');
require('dotenv').config();

async function runTests() {
    console.log("🚀 Starting AI Logic Verification...\n");

    // Test 1: Ticket Creation Intent
    console.log("--- Test 1: Ticket Creation Intent ---");
    const intent1 = await aiService.detectIntent("Please create a ticket for my broken monitor.");
    console.log("User: Please create a ticket for my broken monitor.");
    console.log("Result:", JSON.stringify(intent1, null, 2));
    if (intent1.action === 'create_ticket') {
        console.log("✅ SUCCESS: Ticket intent correctly detected.");
    } else {
        console.log("❌ FAILURE: Ticket intent NOT detected.");
    }
    console.log("");

    // Test 2: Hardware Troubleshooting Intent
    console.log("--- Test 2: Hardware Troubleshooting Intent ---");
    const intent2 = await aiService.detectIntent("My keyboard is acting weird.");
    console.log("User: My keyboard is acting weird.");
    console.log("Result:", JSON.stringify(intent2, null, 2));
    if (intent2.needs_troubleshooting === true && intent2.action === 'troubleshoot') {
        console.log("✅ SUCCESS: Troubleshooting intent correctly detected.");
    } else {
        console.log("❌ FAILURE: Troubleshooting intent NOT detected properly.");
    }
    console.log("");

    // Test 3: Dynamic Step Generation
    console.log("--- Test 3: Dynamic Step Generation ---");
    try {
        const steps = await aiService.generateDynamicSteps("My keyboard is acting weird.");
        console.log("User: My keyboard is acting weird.");
        console.log("Generated Steps count:", steps.length);
        console.log("Example Step 1:", steps[0]?.instruction);

        if (Array.isArray(steps) && steps.length === 5) {
            console.log("✅ SUCCESS: 5 dynamic steps generated.");
        } else {
            console.log("❌ FAILURE: Failed to generate 5 dynamic steps.");
        }
    } catch (error) {
        console.log("❌ ERROR:", error.message);
    }
    console.log("");

    console.log("🏁 Verification complete.");
}

runTests();
