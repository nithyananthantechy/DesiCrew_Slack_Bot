/**
 * Parse JSON content
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
const parse = async (buffer) => {
    try {
        const json = JSON.parse(buffer.toString('utf-8'));
        // If it's a structured article, format it nicely
        if (json.title && json.steps) {
            let content = `# ${json.title}\n\n`;
            if (json.description) content += `${json.description}\n\n`;
            json.steps.forEach((step, index) => {
                content += `## Step ${index + 1}: ${step.title}\n${step.instruction}\n\n`;
            });
            return content;
        }
        return JSON.stringify(json, null, 2);
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
    }
};

module.exports = { parse };
