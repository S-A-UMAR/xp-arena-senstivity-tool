const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        },
        multipleStatements: true
    });

    try {
        console.log('--- XP ARENA DATABASE INITIALIZATION ---');
        console.log('Connecting to TiDB...');
        
        const dbName = process.env.DB_NAME || 'xp_sensitivity_tool';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        const [existing] = await connection.query(
            `SELECT COUNT(*) AS c
             FROM information_schema.tables
             WHERE table_schema = ? AND table_name = 'vendors'`,
            [dbName]
        );

        if (!existing[0] || existing[0].c === 0) {
            let sql = fs.readFileSync(path.join(__dirname, 'vault.sql'), 'utf8');
            sql = sql.replace(/CREATE DATABASE IF NOT EXISTS\s+\w+;/i, `CREATE DATABASE IF NOT EXISTS ${dbName};`);
            sql = sql.replace(/USE\s+\w+;/i, `USE ${dbName};`);
            console.log('Fresh database detected. Executing full migration script...');
            await connection.query(sql);
        } else {
            console.log('Existing database detected. Skipping full seed script (non-destructive mode).');
        }

        console.log('Schema alignment + seed normalization...');
        console.log('Database Name:', dbName);

        // Post-seed normalization: hash admin vendor key and set lookup_key
        try {
            // Align schema via ALTERs (idempotent)
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(20) UNIQUE NULL`);
            await connection.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS active_until DATETIME DEFAULT NULL");
        await connection.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS usage_limit INT DEFAULT NULL");
        await connection.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500) DEFAULT NULL");
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(16) UNIQUE NOT NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS creator_advice TEXT NULL`);
            await connection.query(`ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(16) NOT NULL`);
            await connection.query(`ALTER TABLE code_activity ADD INDEX IF NOT EXISTS idx_lookup_key (lookup_key)`);
            await connection.query(`INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL')`);
            await connection.query(`INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0')`);

            const seedKey = process.env.SEED_VENDOR_KEY || process.env.ADMIN_SECRET || null;
            const forceReset = process.env.FORCE_RESET_ADMIN_KEY === 'true';
            const [rows] = await connection.query('SELECT vendor_id, access_key, lookup_key FROM vendors WHERE vendor_id = ?', ['XP-ADMIN']);
            if (seedKey && (!rows[0] || forceReset)) {
                const hash = await bcrypt.hash(seedKey, 10);
                const lookup = require('crypto').createHash('sha1').update(seedKey).digest('hex').substring(0, 10);
                if (!rows[0]) {
                    await connection.query(
                        `INSERT INTO vendors (org_id, vendor_id, access_key, lookup_key, brand_config, status)
                         VALUES ('XP-CORE-ORG', 'XP-ADMIN', ?, ?, '{}', 'active')`,
                        [hash, lookup]
                    );
                    console.log('XP-ADMIN seed inserted from environment secret.');
                } else {
                    await connection.query('UPDATE vendors SET access_key = ?, lookup_key = ? WHERE vendor_id = ?', [hash, lookup, 'XP-ADMIN']);
                    console.log('XP-ADMIN key rotated from environment secret.');
                }
            } else if (!seedKey) {
                console.log('No ADMIN_SECRET/SEED_VENDOR_KEY provided. Skipping XP-ADMIN seed key creation.');
            }
        } catch (e) {
            console.warn('Seed normalization skipped:', e.message);
        }
    } catch (err) {
        console.error('MIGRATION FAILED:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
