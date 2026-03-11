const aiService = require('./services/aiService');

(async () => {
    console.log("Testing detectIntent fallback...");
    let intent = await aiService.detectIntent("need install chrome");
    console.log("Fallback Output:", intent);
})();
