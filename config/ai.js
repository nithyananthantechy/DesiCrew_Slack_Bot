require('dotenv').config();

module.exports = {
    provider: process.env.AI_PROVIDER || 'gemini', // Primary provider
    priority: (process.env.AI_PRIORITY || 'gemini,openai,ollama').split(','),
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-pro'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama2'
    }
};
