const { db } = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function provisionTestVendor() {
    console.log('--- 🧪 PROVISIONING E2E TEST VENDOR ---');
    try {
        const vendorId = 'E2E_TEST_VND_' + Math.floor(1000 + Math.random() * 9000);
        const accessKeyRaw = `XP-${vendorId}-0000`;
        const hashedKey = await bcrypt.hash(accessKeyRaw, 10);
        const lookupKey = crypto.createHash('sha256').update(accessKeyRaw).digest('hex').substring(0, 8);

        const brandConfig = {
            display_name: "E2E_TEST_LABS",
            logo_url: "https://placehold.co/100x100?text=E2E",
            youtube: "https://youtube.com/e2etest",
            colors: { primary: "#ff00ff" }
        };

        await db.run("INSERT IGNORE INTO organizations (org_id, org_name) VALUES (?, ?)", ['E2E-ORG', 'E2E Organization']);
        await db.run(`
            INSERT INTO vendors (org_id, vendor_id, access_key, lookup_key, brand_config, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `, ['E2E-ORG', vendorId, hashedKey, lookupKey, JSON.stringify(brandConfig)]);

        console.log(`✅ TEST_VENDOR_PROVISIONED: ${vendorId}`);
        console.log(`🔑 ACCESS_KEY: ${accessKeyRaw}`);
        process.exit(0);
    } catch (e) {
        console.error('❌ PROVISION_FAILED:', e);
        process.exit(1);
    }
}

provisionTestVendor();
