const pdf = require("pdf-parse");

/**
 * Parse PDF content
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
const parse = async (buffer) => {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

module.exports = { parse };
