const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xp_sensitivity_tool',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) : 10,
    queueLimit: 0,
    connectTimeout: 5000, // ⚡ 5s timeout to prevent serverless hang
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
    }
});

// Diagnostic Connection Ping
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ DB_CONNECTION_ESTABLISHED');
        conn.release();
    } catch (err) {
        console.error('❌ DB_CONNECTION_FAILED:', err.message);
    }
})();

const databaseHelper = {
    async query(sql, params) {
        const [results] = await pool.execute(sql, params);
        return results;
    },
    async get(sql, params) {
        const [results] = await pool.execute(sql, params);
        return results[0];
    },
    async all(sql, params) {
        const [results] = await pool.execute(sql, params);
        return results;
    },
    async run(sql, params) {
        const [results] = await pool.execute(sql, params);
        return {
            lastID: results.insertId,
            changes: results.affectedRows
        };
    },
    async getOrg(orgId) {
        return this.get('SELECT * FROM organizations WHERE org_id = ?', [orgId]);
    }
};

module.exports = {
    pool,
    db: databaseHelper
};
