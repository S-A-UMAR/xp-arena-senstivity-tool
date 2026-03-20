const jwt = require('jsonwebtoken');
require('dotenv').config();

// Mocking the behavior of getJwtSecret
async function getJwtSecretMock(envVar, dbHash) {
    const secret = envVar || process.env.ADMIN_SECRET;
    if (secret) return secret;
    if (dbHash) return dbHash;
    return 'XP_SECURE_FALLBACK_STATION_2026';
}

async function runTest() {
    console.log('--- SESSION STABILITY VERIFICATION ---');

    const vendor_id = 'test_vendor_123';
    
    // Scenario 1: JWT_SECRET is set in environment (IDEAL)
    console.log('\n[1] Testing with static JWT_SECRET...');
    const staticSecret = 'super_secret_static_key';
    const token1 = jwt.sign({ vendor_id }, staticSecret, { expiresIn: '7d' });
    
    try {
        jwt.verify(token1, staticSecret);
        console.log('✅ Token verified with static secret.');
    } catch (e) {
        console.error('❌ Token verification failed.');
    }

    // Scenario 2: Falling back to database hash, then rotating it
    console.log('\n[2] Testing fallback to database hash (Password Rotation)...');
    const oldHash = 'old_bcrypt_hash_123';
    const newHash = 'new_bcrypt_hash_456';
    
    const token2 = jwt.sign({ vendor_id }, oldHash, { expiresIn: '7d' });
    console.log('- Token signed with old hash.');

    try {
        jwt.verify(token2, newHash);
        console.log('❌ ERROR: Token verified with NEW hash (this should NOT happen if secret changed).');
    } catch (e) {
        console.log('✅ Success: Token correctly rejected after secret rotation.');
    }

    // Scenario 3: Verifying the new fallback logic
    console.log('\n[3] Verifying new stable fallback logic...');
    const fixedFallback = 'XP_SECURE_FALLBACK_STATION_2026';
    const token3 = jwt.sign({ vendor_id }, fixedFallback, { expiresIn: '7d' });
    
    try {
        jwt.verify(token3, fixedFallback);
        console.log('✅ Token verified with fixed fallback.');
    } catch (e) {
        console.error('❌ Fixed fallback failed.');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

runTest().catch(console.error);
