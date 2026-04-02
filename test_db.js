const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT, 10),
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: false
            }
        });
        console.log('SUCCESS');
        await connection.end();
    } catch (err) {
        console.error('FAILURE:', err.message);
    }
}
test();
