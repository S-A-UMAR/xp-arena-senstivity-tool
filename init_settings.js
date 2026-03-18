const { db } = require('./db');

async function init() {
    try {
        console.log('--- Initializing system_settings table ---');
        await db.run('CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR(50) PRIMARY KEY, setting_value VARCHAR(255) NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
        await db.run("INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('global_sensitivity_offset', '1.0')");
        console.log('--- SUCCESS: system_settings initialized ---');
        process.exit(0);
    } catch (e) {
        console.error('--- FAILURE: init failed ---', e);
        process.exit(1);
    }
}

init();
