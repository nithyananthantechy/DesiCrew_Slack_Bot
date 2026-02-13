const aiService = require('./services/aiService');

async function testChain() {
    console.log("--- STARTING AI CHAIN VERIFICATION ---");

    const issues = [
        "My keyboard is acting weird",
        "My network is slow",
        "password is not work",
        "Hi",
        "Please create a ticket for my printer"
    ];

    for (const issue of issues) {
        console.log(`\nTesting Issue: "${issue}"`);
        try {
            console.log("Testing Intent Detection...");
            const intent = await aiService.detectIntent(issue);
            console.log("Intent Result:", JSON.stringify(intent, null, 2));

            if (intent.action === 'troubleshoot') {
                console.log("Testing Dynamic Step Generation...");
                const steps = await aiService.generateDynamicSteps(issue);
                console.log("Steps Generated:", steps.length);
                steps.forEach((s, i) => console.log(`${i + 1}. ${s.instruction}`));
            }
        } catch (error) {
            console.error("Test failed for issue:", issue, error);
        }
    }
    console.log("\n--- VERIFICATION COMPLETE ---");
}

testChain();
