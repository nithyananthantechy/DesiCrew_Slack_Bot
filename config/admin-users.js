require('dotenv').config();

const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',') : [];

module.exports = {
    adminUsers,
    isAdmin: (userId) => adminUsers.includes(userId)
};
