const { db } = require('./db');

async function harmonize() {
    console.log('🚀 Starting Database Harmonization...');

    try {
        // 1. Sync active_until from legacy account_subscriptions to vendors
        console.log('Syncing subscription data...');
        await db.run(`
            UPDATE vendors v
            JOIN account_subscriptions s ON v.vendor_id = s.account_id
            SET v.active_until = s.active_until
            WHERE v.active_until IS NULL OR v.active_until < s.active_until
        `).catch(e => console.log('Notice: No subscriptions to sync or table missing.'));

        // 2. Sync vendor_id in sensitivity_keys from account_id if available
        console.log('Syncing key ownership...');
        await db.run(`
            UPDATE sensitivity_keys 
            SET vendor_id = account_id 
            WHERE vendor_id IS NULL AND account_id IS NOT NULL
        `).catch(e => console.log('Notice: No keys to sync or column missing.'));

        // 3. Drop legacy tables
        console.log('Dropping legacy tables...');
        const tablesToDrop = ['account_registry', 'account_subscriptions', 'activity_ledger'];
        for (const table of tablesToDrop) {
            await db.run(`DROP TABLE IF EXISTS ${table}`);
            console.log(`- Dropped ${table} (if it existed)`);
        }

        // 4. Drop legacy columns
        console.log('Dropping legacy columns...');
        await db.run('ALTER TABLE sensitivity_keys DROP COLUMN IF EXISTS account_id').catch(e => console.log('- Notice: account_id column already gone or error.'));

        // 5. Ensure indices on vendor_id for performance and FK safety
        console.log('Ensuring indices...');
        await db.run('ALTER TABLE sensitivity_keys ADD INDEX IF NOT EXISTS idx_vendor_id (vendor_id)').catch(() => {});
        await db.run('ALTER TABLE vendor_presets ADD INDEX IF NOT EXISTS idx_vendor_id (vendor_id)').catch(() => {});
        await db.run('ALTER TABLE code_activity ADD INDEX IF NOT EXISTS idx_lookup_key (lookup_key)').catch(() => {});

        console.log('✅ Harmonization Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Harmonization Failed:', err);
        process.exit(1);
    }
}

harmonize();
