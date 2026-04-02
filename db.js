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
    connectTimeout: 15000, // ⚡ 15s timeout to prevent serverless hang in cold starts
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false // ⚡ Resilient for TiDB Cloud / Vercel
    }
});

// Diagnostic connection ping (skip during tests to avoid async logs after Jest teardown)
async function runConnectionDiagnostic() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ DB_CONNECTION_ESTABLISHED');
        conn.release();
    } catch (err) {
        const msg = err && err.message ? err.message : 'UNKNOWN_DB_ERROR';
        console.error('❌ DB_CONNECTION_FAILED:', msg);
    }
}

if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    runConnectionDiagnostic();
}

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
    },
    async setCache(key, value, ttlSeconds = 3600) {
        try {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await this.run('REPLACE INTO transient_cache (cache_key, cache_value, expires_at) VALUES (?, ?, ?)', 
                [key, JSON.stringify(value), expiresAt]);
        } catch (e) {
            console.warn('⚠️ CACHE_SET_FAILED:', e.message);
        }
    },
    async getCache(key) {
        try {
            const row = await this.get('SELECT cache_value, expires_at FROM transient_cache WHERE cache_key = ?', [key]);
            if (!row) return null;
            if (new Date(row.expires_at) < new Date()) {
                // Background cleanup (no await to avoid latency)
                this.run('DELETE FROM transient_cache WHERE cache_key = ?', [key]).catch(() => {});
                return null;
            }
            return typeof row.cache_value === 'string' ? JSON.parse(row.cache_value) : row.cache_value;
        } catch (e) {
            console.warn('⚠️ CACHE_GET_FAILED:', e.message);
            return null;
        }
    },
    async clearExpiredCache() {
        return this.run('DELETE FROM transient_cache WHERE expires_at < NOW()').catch(() => {});
    }
};

module.exports = {
    pool,
    db: databaseHelper
};
