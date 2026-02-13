const fs = require('fs-extra');
const path = require('path');
const documentParser = require('./documentParser');

const ARTICLES_DIR = path.join(__dirname, '../articles');
let articlesCache = [];

/**
 * Load all articles from the articles directory
 */
const loadArticles = async () => {
    try {
        await fs.ensureDir(ARTICLES_DIR);
        const files = await fs.readdir(ARTICLES_DIR);

        const loadedArticles = [];
        for (const file of files) {
            const filePath = path.join(ARTICLES_DIR, file);
            try {
                const content = await documentParser.parseDocument(filePath);

                // Try to parse metadata if it's JSON
                let metadata = {};
                if (file.endsWith('.json')) {
                    try {
                        const jsonContent = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                        metadata = {
                            title: jsonContent.title || file,
                            keywords: jsonContent.keywords || [],
                            issue_type: jsonContent.issue_type || 'general',
                            steps: jsonContent.steps || []
                        };
                    } catch (e) {
                        // If parsing fails here, it might have been parsed by documentParser as string
                    }
                }

                loadedArticles.push({
                    id: file,
                    content,
                    ...metadata
                });
            } catch (error) {
                console.error(`Failed to load article ${file}:`, error);
            }
        }
        articlesCache = loadedArticles;
        console.log(`Loaded ${articlesCache.length} articles into Knowledge Base.`);
    } catch (error) {
        console.error("Error loading articles:", error);
    }
};

/**
 * Find relevant article for a given issue type or query
 * @param {string} issueType 
 * @returns {object|null}
 */
const findArticle = (issueType) => {
    // Simple matching logic for now
    // deeper search would require vector embeddings or keyword matching
    return articlesCache.find(a => a.issue_type === issueType) || null;
};

/**
 * Get all available articles
 */
const getAllArticles = () => {
    return articlesCache;
}

module.exports = {
    loadArticles,
    findArticle,
    getAllArticles
};
