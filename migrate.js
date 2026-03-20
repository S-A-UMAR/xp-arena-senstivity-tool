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
        console.log('Connecting to TiDB: ', process.env.DB_HOST);
        
        const dbName = process.env.DB_NAME || 'xp_sensitivity_tool';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        console.log('Synchronizing schema with unified_schema.sql...');
        let sql = fs.readFileSync(path.join(__dirname, 'unified_schema.sql'), 'utf8');
        // Ensure the correct database is used in the script
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS\s+[\w`]+;/i, `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        sql = sql.replace(/USE\s+[\w`]+;/i, `USE \`${dbName}\`;`);
        
        // Split by semicolon but ignore inside JSON or strings
        const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/).filter(s => s.trim());
        for (const s of statements) {
            try {
                await connection.query(s);
            } catch (e) {
                if (!e.message.includes('already exists') && !e.message.includes('Duplicate column')) {
                    console.warn(`Migration step warning: ${e.message}`);
                }
            }
        }
        console.log('✅ Schema base layer synchronized.');

        console.log('Schema alignment + seed normalization...');
        console.log('Database Name:', dbName);

        // Post-seed normalization: hash admin vendor key and set lookup_key
        try {
            // Align schema via ALTERs (TiDB compatible: split column add and index/unique)
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_id VARCHAR(50) NULL`);
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(20) NULL`);
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS active_until DATETIME NULL`);
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500) NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(16) UNIQUE NOT NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS creator_advice TEXT NULL`);
            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS usage_limit INT NULL`);
            
            // Add foreign key for org_id if it doesn't exist
            try { await connection.query(`ALTER TABLE vendors ADD CONSTRAINT fk_vendor_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL`); } catch(e) {}
            
            // Add unique constraint for lookup_key
            try { await connection.query(`ALTER TABLE vendors ADD UNIQUE INDEX IF NOT EXISTS idx_vendor_lookup (lookup_key)`); } catch(e) {}
            
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(16) NOT NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS creator_advice TEXT NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS custom_results_json JSON NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS usage_limit INT NULL`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS current_usage INT DEFAULT 0`);
            await connection.query(`ALTER TABLE sensitivity_keys ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL`);
            
            try { await connection.query(`ALTER TABLE sensitivity_keys ADD UNIQUE INDEX IF NOT EXISTS idx_key_lookup (lookup_key)`); } catch(e) {}

            await connection.query(`ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(16) NOT NULL`);
            await connection.query(`ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS feedback_rating INT NULL`);
            await connection.query(`ALTER TABLE code_activity ADD COLUMN IF NOT EXISTS feedback_comment TEXT NULL`);
            await connection.query(`ALTER TABLE code_activity ADD INDEX IF NOT EXISTS idx_lookup_key (lookup_key)`);
            await connection.query(`INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL')`);
            await connection.query(`INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0')`);

            await connection.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) DEFAULT 'admin@xp-arena.pro'`);
            await connection.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status ENUM('active', 'trial', 'suspended') DEFAULT 'active'`);
            await connection.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_tier ENUM('basic', 'pro', 'enterprise') DEFAULT 'pro'`);

            await connection.query(`CREATE TABLE IF NOT EXISTS vendor_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id VARCHAR(50) NOT NULL,
                preset_name VARCHAR(100) NOT NULL,
                config_json JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);

            await connection.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL`);

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
