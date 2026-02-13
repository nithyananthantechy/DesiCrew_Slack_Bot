/**
 * Format a date to a readable string
 * @param {Date} date 
 * @returns {string}
 */
const formatDate = (date) => {
    return new Date(date).toLocaleString();
};

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms 
 * @returns {Promise}
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
    formatDate,
    sleep
};
