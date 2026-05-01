const { db } = require('./db');
(async () => {
    try {
        const row = await db.get("SELECT setting_value FROM system_settings WHERE setting_key = 'admin_secret'");
        console.log('DB_ADMIN_SECRET:', row ? row.setting_value : 'NOT_FOUND');
        process.exit(0);
    } catch (err) {
        console.error('DB_ERR:', err);
        process.exit(1);
    }
})();
