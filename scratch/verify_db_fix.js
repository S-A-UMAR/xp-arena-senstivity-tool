const { db, runConnectionDiagnostic } = require('../db');

async function verify() {
    console.log('--- AXP DATABASE DIAGNOSTIC ---');
    
    // 1. Check Connection
    await runConnectionDiagnostic();
    
    // 2. Check Database Name
    try {
        const row = await db.get('SELECT DATABASE() as dbname');
        console.log(`Connected to database: ${row.dbname}`);
        if (row.dbname !== 'xp_sensitivity_tool') {
            console.warn('⚠️ WARNING: Not connected to xp_sensitivity_tool!');
        } else {
            console.log('✅ Correct database selected.');
        }
    } catch (err) {
        console.error('❌ Failed to get database name:', err.message);
    }
    
    // 3. Check Tables
    const tables = ['vendors', 'sensitivity_keys', 'code_activity', 'system_settings'];
    for (const table of tables) {
        try {
            const count = await db.get(`SELECT COUNT(*) as c FROM ${table}`);
            console.log(`✅ Table [${table}] exists. Row count: ${count.c}`);
        } catch (err) {
            console.error(`❌ Table [${table}] missing or error:`, err.message);
        }
    }
    
    console.log('--- DIAGNOSTIC COMPLETE ---');
    process.exit(0);
}

verify();
