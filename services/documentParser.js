const path = require('path');
const fs = require('fs-extra');
const jsonParser = require('../parsers/jsonParser');
const markdownParser = require('../parsers/markdownParser');
const textParser = require('../parsers/textParser');
const docxParser = require('../parsers/docxParser');
const pdfParser = require('../parsers/pdfParser');

const PARSERS = {
    '.json': jsonParser,
    '.md': markdownParser,
    '.txt': textParser,
    '.docx': docxParser,
    '.pdf': pdfParser
};

/**
 * Parse a file based on its extension
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
const parseDocument = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const parser = PARSERS[ext];

    if (!parser) {
        throw new Error(`Unsupported file type: ${ext}`);
    }

    try {
        const buffer = await fs.readFile(filePath);
        return await parser.parse(buffer);
    } catch (error) {
        throw new Error(`Error parsing file ${filePath}: ${error.message}`);
    }
};

module.exports = {
    parseDocument
};
