'use strict';

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://campus:campus@localhost:5432/campus_link',
});

async function query(sql, params = []) {
    return pool.query(sql, params);
}

async function healthCheck() {
    await pool.query('SELECT 1');
}

function getUserId(req) {
    return req.headers['x-user-id'] || req.user?.id || null;
}

function getUserEmail(req) {
    return req.headers['x-user-email'] || req.user?.email || null;
}

function initials(firstName, lastName) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

module.exports = {
    pool,
    query,
    healthCheck,
    getUserId,
    getUserEmail,
    initials,
};
