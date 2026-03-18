const { db } = require('../db');

async function migrate() {
    try {
        console.log('⚡ STARTING_VENDOR_MIGRATION...');
        await db.run("ALTER TABLE sensitivity_keys ADD COLUMN creator_advice TEXT DEFAULT NULL;");
        console.log('✅ SYNC_COMPLETE: creator_advice column added.');
        process.exit(0);
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('⚠️ PREFLIGHT_SYNC: Column already exists.');
            process.exit(0);
        }
        console.error('❌ MIGRATION_FAILED:', e);
        process.exit(1);
    }
}

migrate();
