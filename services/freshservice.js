const axios = require('axios');
const fs = require('fs-extra');
require('dotenv').config();

const FRESHSERVICE_DOMAIN = process.env.FRESHSERVICE_DOMAIN;
const FRESHSERVICE_API_KEY = process.env.FRESHSERVICE_API_KEY;

/**
 * createTicket
 * Creates a ticket in Freshservice
 * @param {object} ticketData 
 * @returns {Promise<object>}
 */
const createTicket = async (ticketData) => {
    if (!FRESHSERVICE_DOMAIN || !FRESHSERVICE_API_KEY) {
        console.warn("Freshservice credentials not found. Mocking ticket creation.");
        return {
            id: Math.floor(Math.random() * 10000),
            subject: ticketData.subject,
            description: ticketData.description,
            status: 2,
            priority: 1
        };
    }

    try {
        const response = await axios.post(`https://${FRESHSERVICE_DOMAIN}/api/v2/tickets`, {
            description: ticketData.description,
            subject: ticketData.subject,
            email: ticketData.email,
            name: ticketData.name || "Slack User",
            priority: 1,
            status: 2,
            source: 2, // Portal
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(FRESHSERVICE_API_KEY + ':X').toString('base64')}`
            }
        });
        return response.data.ticket;
    } catch (error) {
        console.error("Error creating Freshservice ticket:", error.response ? error.response.data : error.message);
        throw new Error("Failed to create ticket.");
    }
};

module.exports = {
    createTicket
};
