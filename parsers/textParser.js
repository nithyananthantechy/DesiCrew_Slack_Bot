/**
 * Parse Text content
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
const parse = async (buffer) => {
    return buffer.toString('utf-8');
};

module.exports = { parse };
