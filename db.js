const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xp_sensitivity_tool',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) : 10,
    queueLimit: 0,
    connectTimeout: 5000, 
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    }
});

// Lazy diagnostic helper (not called at top-level to prevent Vercel boot hang)
async function runConnectionDiagnostic() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ DB_CONNECTION_ESTABLISHED');
        conn.release();
    } catch (err) {
        console.error('❌ DB_CONNECTION_FAILED:', err?.message || 'UNKNOWN');
    }
}

const databaseHelper = {
    async query(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (err) {
            console.error(`DB_QUERY_ERR: ${err.message}`, { sql });
            throw err;
        }
    },
    async get(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return results ? results[0] : null;
        } catch (err) {
            console.error(`DB_GET_ERR: ${err.message}`, { sql });
            throw err;
        }
    },
    async all(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return results || [];
        } catch (err) {
            console.error(`DB_ALL_ERR: ${err.message}`, { sql });
            throw err;
        }
    },
    async run(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return {
                lastID: results?.insertId || null,
                changes: results?.affectedRows || 0
            };
        } catch (err) {
            console.error(`DB_RUN_ERR: ${err.message}`, { sql });
            throw err;
        }
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
