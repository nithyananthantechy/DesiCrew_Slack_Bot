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
 * @param {string} issueTypeOrQuery - Issue type or user's question text
 * @returns {object|null}
 */
const findArticle = (issueTypeOrQuery) => {
    if (!issueTypeOrQuery) return null;

    const query = issueTypeOrQuery.toLowerCase();

    // 1. Try exact issue_type match first
    const exactMatch = articlesCache.find(a => a.issue_type === issueTypeOrQuery);
    if (exactMatch) {
        console.log(`✅ Found exact match by issue_type: ${exactMatch.title}`);
        return exactMatch;
    }

    // 2. Try keyword matching - search for articles where keywords appear in query
    const keywordMatches = articlesCache.filter(article => {
        if (!article.keywords || article.keywords.length === 0) return false;

        // Check if any keyword appears in the user's query
        return article.keywords.some(keyword =>
            query.includes(keyword.toLowerCase())
        );
    });

    if (keywordMatches.length > 0) {
        // Return the article with most keyword matches
        const scored = keywordMatches.map(article => {
            const matchCount = article.keywords.filter(keyword =>
                query.includes(keyword.toLowerCase())
            ).length;
            return { article, matchCount };
        });

        scored.sort((a, b) => b.matchCount - a.matchCount);
        console.log(`✅ Found keyword match: ${scored[0].article.title} (${scored[0].matchCount} keywords matched)`);
        return scored[0].article;
    }

    // 3. Try title matching
    const titleMatch = articlesCache.find(a =>
        a.title && query.includes(a.title.toLowerCase())
    );
    if (titleMatch) {
        console.log(`✅ Found title match: ${titleMatch.title}`);
        return titleMatch;
    }

    console.log(`ℹ️ No article found for: "${issueTypeOrQuery}"`);
    return null;
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
