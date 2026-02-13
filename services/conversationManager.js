const NodeCache = require("node-cache");

// Cache for storing conversation state
// stdTTL: 1 hour (3600 seconds)
const conversationCache = new NodeCache({ stdTTL: 3600 });

/**
 * Get conversation state for a user
 * @param {string} userId 
 * @returns {object}
 */
const getConversationState = (userId) => {
    const state = conversationCache.get(userId);
    if (!state) {
        return {
            step: 0,
            history: [],
            currentArticle: null,
            context: null,
            ticketCreated: false,
            state: 'IDLE', // IDLE, AWAITING_EMP_ID, AWAITING_HOSTNAME
            pendingTicketData: null // { subject, description, empId, hostname, type }
        };
    }
    return state;
};

/**
 * Update conversation state for a user
 * @param {string} userId 
 * @param {object} updates 
 */
const updateConversationState = (userId, updates) => {
    const currentState = getConversationState(userId);
    const newState = { ...currentState, ...updates };
    conversationCache.set(userId, newState);
    return newState;
};

/**
 * Clear conversation state for a user
 * @param {string} userId 
 */
const clearConversationState = (userId) => {
    conversationCache.del(userId);
};

/**
 * Add a message to the conversation history
 * @param {string} userId 
 * @param {string} role 'user' or 'assistant'
 * @param {string} content 
 */
const addMessageToHistory = (userId, role, content) => {
    const state = getConversationState(userId);
    const newHistory = [...state.history, { role, content, timestamp: new Date() }];
    // Keep only the last 20 messages to manage context
    if (newHistory.length > 20) {
        newHistory.shift();
    }
    updateConversationState(userId, { history: newHistory });
};

module.exports = {
    getConversationState,
    updateConversationState,
    clearConversationState,
    addMessageToHistory
};
