const mysql = require('mysql2/promise');
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
        let sql = fs.readFileSync(path.join(__dirname, 'vault.sql'), 'utf8');
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS\s+\w+;/i, `CREATE DATABASE IF NOT EXISTS ${dbName};`);
        sql = sql.replace(/USE\s+\w+;/i, `USE ${dbName};`);
        console.log('Executing migration script...');
        
        await connection.query(sql);
        
        console.log('SUCCESS: All tables created and admin seeded.');
        console.log('Database Name:', dbName);
    } catch (err) {
        console.error('MIGRATION FAILED:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
