const mammoth = require("mammoth");

/**
 * Parse DOCX content
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
const parse = async (buffer) => {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
};

module.exports = { parse };
