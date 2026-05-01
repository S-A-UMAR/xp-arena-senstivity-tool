const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 4000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    };

    console.log('--- DB DIAGNOSTICS ---');
    console.log('Host:', config.host);
    console.log('User:', config.user);
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connection Success');

        const [settings] = await connection.execute('SELECT * FROM system_settings WHERE setting_key = "admin_secret"');
        console.log('Admin Secret in DB:', settings.length > 0 ? 'PRESENT (Hashed/Hidden)' : 'NOT PRESENT (Using .env)');
        if (settings.length > 0) {
            console.log('DB Value snippet:', settings[0].setting_value.substring(0, 10) + '...');
        }

        const [logs] = await connection.execute('SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Security Logs:', logs);

        const [vendors] = await connection.execute('SELECT COUNT(*) as count FROM vendors');
        console.log('Total Vendors:', vendors[0].count);

    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

diagnose();
