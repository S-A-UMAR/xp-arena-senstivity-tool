const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Calculator = require('../lib/calculator');

// ⚡ HotCache: In-Memory Express Lane (10/10 Speed)
const HotCache = {
    _cache: new Map(),
    get(key) {
        const item = this._cache.get(key);
        if (item && item.expiry > Date.now()) return item.data;
        this._cache.delete(key);
        return null;
    },
    set(key, data, ttl = 300000) { // Default 5 mins
        this._cache.set(key, { data, expiry: Date.now() + ttl });
    }
};

function getLookupKey(code) {
    return crypto.createHash('sha1').update(code).digest('hex').substring(0, 10);
}

const fail = (res, code, message, status = 400, details = null) => {
    return res.status(status).json({ code, message, details });
};

function parseBearer(header) {
    if (!header) return null;
    const parts = header.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
    return null;
}

function authenticateVendor(req, res, next) {
    try {
        const token = req.cookies.xp_vendor_token || parseBearer(req.headers['authorization']);
        if (!token) return fail(res, 'XP_AUTH_UNAUTHORIZED', 'VENDOR_SESSION_REQUIRED', 401);
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.vendorId = payload.vendor_id;
        next();
    } catch (e) {
        return fail(res, 'XP_AUTH_INVALID', 'SESSION_EXPIRED_OR_CORRUPT', 401);
    }
}

async function checkSoftBan(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    try {
        const recentFailures = await db.get(`
            SELECT COUNT(*) as count FROM security_logs 
            WHERE ip_address = ? AND event_type = 'VERIFY_FAIL' 
            AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        `, [ip]);
        
        if (recentFailures && recentFailures.count >= 5) {
            console.warn(`🛡️ AI_FRAUD_SHIELD_BLOCK: ${ip} (Attempt Count: ${recentFailures.count})`);
            return res.status(429).json({ error: 'SYSTEM_TEMPORARILY_LOCKED_FOR_SECURITY' });
        }
        next();
    } catch (e) {
        next();
    }
}

async function dispatchVendorWebhook(vendorId, eventType, data) {
    try {
        const vendor = await db.get('SELECT webhook_url FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (vendor && vendor.webhook_url) {
            await fetch(vendor.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventType,
                    source: 'XP_ARENA_NEURAL_VAULT',
                    timestamp: new Date().toISOString(),
                    data
                })
            });
        }
    } catch (e) {
        console.error('WEBHOOK_DISPATCH_ERR:', e.message);
    }
}

function authenticateAdmin(req, res, next) {
    try {
        // IP Whitelist Check (10/10 Security)
        const whitelist = process.env.ADMIN_IP_WHITELIST;
        if (whitelist && whitelist !== '*') {
            const allowedIps = whitelist.split(',');
            const clientIp = req.ip || req.connection.remoteAddress;
            if (!allowedIps.includes(clientIp)) {
                console.warn(`🚫 UNAUTHORIZED_IP_BLOCKED: ${clientIp}`);
                return res.status(403).json({ error: 'FORBIDDEN_IP' });
            }
        }

        const token = req.cookies.xp_admin_token || parseBearer(req.headers['authorization']);
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, process.env.ADMIN_SECRET);
        if (payload.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

async function trackEvent(type, orgId, vendorId, session, device) {
    try {
        await db.run(`
            INSERT INTO user_events (event_type, org_id, vendor_id, user_session_id, device_tier)
            VALUES (?, ?, ?, ?, ?)
        `, [type, orgId, vendorId, session, device]);
    } catch (e) {
        console.error('EVENT_TRACK_ERR:', e);
    }
}

async function logAudit(actorType, actorId, action, details, ip) {
    try {
        await db.run(`
            INSERT INTO audit_logs (actor_type, actor_id, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `, [actorType, actorId, action, JSON.stringify(details || {}), ip]);

        if (action.includes('REGISTER') || action.includes('CHANGE')) {
            await sendDiscordAlert(action, `Actor ${actorId} performed ${action}.\nDetails: ${JSON.stringify(details)}`, 0xffaa00);
        }

        if (action.includes('REGISTER') || action.includes('CHANGE')) {
            await sendDiscordAlert(action, `Actor ${actorId} performed ${action}.\nDetails: ${JSON.stringify(details)}`, 0xffaa00);
        }
    } catch (e) {
        console.error('AUDIT_LOG_ERR:', e);
    }
}

async function sendDiscordAlert(title, message, color = 0x00f0ff) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `🛡️ XP ARENA SECURITY: ${title}`,
                    description: message,
                    color: color,
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (e) {
        console.error('DISCORD_NOTIFY_ERR:', e);
    }
}

// POST /api/vault/verify
router.post('/verify', checkSoftBan, async (req, res) => {
    try {
        const schema = z.object({
            input: z.string().min(1),
            user_ign: z.string().optional(),
            user_region: z.string().optional()
        });
        const { input, user_ign, user_region } = schema.parse(req.body); 
        const adminSecret = process.env.ADMIN_SECRET;
        const clientIp = req.ip || req.connection.remoteAddress;

        if (!input) {
            return fail(res, 'XP_VAL_MISSING', 'ACCESS_CODE_REQUIRED', 400);
        }

        // ⚡ HOT-CACHE CHECK
        const cached = HotCache.get(`verify_${input}`);
        if (cached) {
            console.log('⚡ HOT_CACHE_HIT:', input);
            return res.json(cached);
        }

        // 1. Check Master Admin Secret
        if (input === adminSecret) {
            const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_SECRET, { expiresIn: '1d' });
            res.cookie('xp_admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });
            return res.json({
                type: 'admin',
                redirect: '/vendor_panel.html',
                message: 'MASTER ACCESS GRANTED'
            });
        }

        // 2. Fast Lookup Optimization (10/10 Logic)
        const prefix = getLookupKey(input);
        
        // 2a. Check Vendor Access Key (Fast Lookup)
        const vendor = await db.get('SELECT * FROM vendors WHERE lookup_key = ?', [prefix]);
        if (vendor) {
            if (await bcrypt.compare(input, vendor.access_key)) {
                if (vendor.status === 'suspended') {
                    return fail(res, 'XP_AUTH_SUSPENDED', 'PROVIDER_ACCESS_DENIED', 403);
                }
                const token = jwt.sign({ vendor_id: vendor.vendor_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                res.cookie('xp_vendor_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                return res.json({
                    type: 'vendor',
                    redirect: '/vendor_dashboard.html',
                    vendor: {
                        id: vendor.vendor_id,
                        config: typeof vendor.brand_config === 'string' ? JSON.parse(vendor.brand_config) : vendor.brand_config
                    },
                    message: 'VENDOR DASHBOARD UNLOCKED'
                });
            }
        }

        // 3. Check User Entry Code (Sensitivity Key - O1 Lookup)
        const keyData = await db.get(`
            SELECT k.*, v.status as vendor_status, v.brand_config, v.org_id
            FROM sensitivity_keys k
            LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
            WHERE k.lookup_key = ?
        `, [prefix]);

        if (keyData && await bcrypt.compare(input, keyData.entry_code)) {
            // Track Analytics Event
            await trackEvent('landing_view', keyData.org_id, keyData.vendor_id, req.ip, 'mobile');
            if (keyData.vendor_status === 'suspended') {
                return res.status(403).json({ error: 'PROVIDER UNAVAILABLE - ACCESS DENIED' });
            }
            
            if (keyData.status === 'expired' || (keyData.expires_at && new Date(keyData.expires_at) < new Date())) {
                return res.status(403).json({ error: 'KEY EXPIRED OR DEACTIVATED' });
            }

            if (keyData.usage_limit && keyData.current_usage >= keyData.usage_limit) {
                return res.status(403).json({ error: 'USAGE LIMIT REACHED' });
            }
            
            await db.run('UPDATE sensitivity_keys SET current_usage = current_usage + 1 WHERE id = ?', [keyData.id]);
            await db.run('INSERT INTO code_activity (entry_code, user_ign, user_region) VALUES (?, ?, ?)', [input, user_ign || 'Anonymous', user_region || 'Unknown']);

            let finalResults = typeof keyData.results_json === 'string' ? JSON.parse(keyData.results_json) : keyData.results_json;
            if (keyData.custom_results_json) {
                const custom = typeof keyData.custom_results_json === 'string' ? JSON.parse(keyData.custom_results_json) : keyData.custom_results_json;
                finalResults = { ...finalResults, ...custom };
            }

            // Dispatch Vendor Webhook (10/10 Feature)
            await dispatchVendorWebhook(keyData.vendor_id, 'CODE_VERIFIED', {
                user_ign: user_ign || 'Anonymous',
                device: `${finalResults.brand} ${finalResults.model}`,
                region: user_region || 'Unknown',
                formula_version: finalResults.formula_version
            });

            // Emit Real-time Event
            const io = req.app.get('io');
            if (io) {
                io.emit('live_event', {
                    type: 'verify',
                    vendor_id: keyData.vendor_id,
                    user_ign: user_ign || 'Anonymous',
                    device: `${finalResults.brand} ${finalResults.model}`,
                    timestamp: new Date().toISOString()
                });
            }

            // HotCache Warmup
            HotCache.set(`verify_${input}`, {
                type: 'user',
                redirect: '/result.html',
                results: finalResults,
                branding: typeof keyData.brand_config === 'string' ? JSON.parse(keyData.brand_config) : keyData.brand_config,
                message: 'CALIBRATION DATA RETRIEVED'
            });

            return res.json({
                type: 'user',
                redirect: '/result.html',
                results: finalResults,
                branding: typeof keyData.brand_config === 'string' ? JSON.parse(keyData.brand_config) : keyData.brand_config,
                message: 'CALIBRATION DATA RETRIEVED'
            });
        }

        // 🛡️ AI Fraud Detection (Log Failure)
        await db.run('INSERT INTO security_logs (ip_address, event_type, details) VALUES (?, ?, ?)', 
            [clientIp, 'VERIFY_FAIL', JSON.stringify({ input_length: input.length })]);

        return res.status(404).json({ error: 'INVALID ACCESS KEY' });
    } catch (e) {
        console.error('Vault Verification Error:', e);
        res.status(500).json({ error: 'VAULT SYSTEM ERROR' });
    }
});

router.post('/admin/login', async (req, res) => {
    try {
        const schema = z.object({ password: z.string().min(4) });
        const { password } = schema.parse(req.body || {});
        if (!password) return res.status(400).json({ error: 'Missing password' });
        if (password !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
        const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_SECRET, { expiresIn: '1d' });
        res.cookie('xp_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.json({ token });
    } catch (e) {
        if (e instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_LOGIN_INPUT', 400);
        next(e);
    }
});

router.post('/vendor/login', async (req, res) => {
    try {
        const schema = z.object({ access_key: z.string().min(6) });
        const { access_key } = schema.parse(req.body || {});
        const vendors = await db.all('SELECT vendor_id, access_key, status FROM vendors');
        let matchedVendor = null;
        for (const v of vendors) {
            if (await bcrypt.compare(access_key, v.access_key)) {
                matchedVendor = v;
                break;
            }
        }

        if (!matchedVendor) return fail(res, 'XP_AUTH_DENIED', 'INVALID_VENDOR_KEY', 401);
        if (matchedVendor.status !== 'active') return fail(res, 'XP_AUTH_SUSPENDED', 'VENDOR_ACCOUNT_LOCKED', 403);

        const token = jwt.sign({ vendor_id: matchedVendor.vendor_id }, process.env.JWT_SECRET || 'xparena_ultra_secure_777', { expiresIn: '7d' });
        res.cookie('xp_vendor_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({ token });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/vault/codes
router.get('/codes', authenticateVendor, async (req, res) => {
    try {
        const vendorId = req.vendorId;

        const codes = await db.all(`
            SELECT k.*, 
            (SELECT COUNT(*) FROM code_activity WHERE entry_code = k.entry_code) as real_usage
            FROM sensitivity_keys k 
            WHERE k.vendor_id = ? 
            ORDER BY k.created_at DESC
        `, [vendorId]);

        res.json(codes);
    } catch (e) {
        console.error('GET /codes error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vault/generate
router.post('/generate', authenticateVendor, async (req, res) => {
    try {
        const schema = z.object({
            results: z.record(z.any()).optional(),
            custom_results: z.record(z.any()).optional(),
            usage_limit: z.union([z.number().int().min(0), z.null()]).optional(),
            expires_in_hours: z.union([z.number().int().min(1), z.null()]).optional()
        });
        const { results, custom_results, usage_limit, expires_in_hours } = schema.parse(req.body);
        const vendorId = req.vendorId;

        const entry_code = Math.floor(100000 + Math.random() * 900000).toString();
        let expires_at = null;
        if (expires_in_hours) {
            expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);
        }

        const hashedCode = await bcrypt.hash(entry_code, 10);
        const lookupKey = getLookupKey(entry_code);

        await db.run(`
            INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, custom_results_json, usage_limit, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            hashedCode, 
            lookupKey,
            vendorId, 
            JSON.stringify(results || {}), 
            custom_results ? JSON.stringify(custom_results) : null,
            usage_limit || null,
            expires_at
        ]);

        res.json({ success: true, entry_code });
    } catch (e) {
        if (e instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_GEN_PARAMS', 400, e.errors);
        next(e); // Let global handler catch unexpected logic crashes
    }
});

// PUT /api/vault/profile
router.put('/profile', authenticateVendor, async (req, res) => {
    try {
        const schema = z.object({
            brand_config: z.object({
                vendor_id: z.string().optional(),
                logo: z.string().optional(),
                colors: z.object({ primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/) }).optional(),
                socials: z.object({ yt: z.string().optional(), ig: z.string().optional() }).optional()
            }).optional(),
            webhook_url: z.string().url().nullable().optional()
        });
        const { brand_config, webhook_url } = schema.parse(req.body);
        const vendorId = req.vendorId;

        if (brand_config) {
            await db.run('UPDATE vendors SET brand_config = ? WHERE vendor_id = ?', [JSON.stringify(brand_config), vendorId]);
        }
        if (webhook_url !== undefined) {
            await db.run('UPDATE vendors SET webhook_url = ? WHERE vendor_id = ?', [webhook_url, vendorId]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error('PUT /profile error:', e);
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/vault/admin/stats
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM vendors) as vendors,
                (SELECT COUNT(*) FROM sensitivity_keys) as codes,
                (SELECT COUNT(*) FROM code_activity) as usage_total,
                (SELECT AVG(rating) FROM code_activity WHERE rating IS NOT NULL) as global_accuracy
        `);
        res.json(stats);
    } catch (e) {
        console.error('GET /admin/stats error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/vault/admin/vendors
// List all vendors for Master Admin
router.get('/admin/vendors', authenticateAdmin, async (req, res) => {
    try {
        const vendors = await db.all(`
            SELECT v.*, 
            (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = v.vendor_id) as total_codes,
            (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.entry_code = sk.entry_code WHERE sk.vendor_id = v.vendor_id) as total_usage
            FROM vendors v
            ORDER BY v.created_at DESC
        `);

        res.json(vendors);
    } catch (e) {
        console.error('GET /admin/vendors error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/vault/admin/vendor/:vendorId/analytics
// Detailed activity for a specific vendor
router.get('/admin/vendor/:vendorId/analytics', authenticateAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;

        const activities = await db.all(`
            SELECT ca.*, sk.results_json
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.entry_code = sk.entry_code
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
            LIMIT 50
        `, [vendorId]);

        res.json(activities);
    } catch (e) {
        console.error('GET /vendor/analytics error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vault/admin/vendors
router.post('/admin/vendors', authenticateAdmin, async (req, res) => {
    try {
        const schema = z.object({
            vendorId: z.string().min(2).optional(),
            brandConfig: z.record(z.any()).optional()
        });
        const { vendorId: requestedId, brandConfig } = schema.parse(req.body);
        
        // Generate Vendor ID if not provided, or clean up provided one
        const vendorId = requestedId ? requestedId.toUpperCase().replace(/\s+/g, '-') : 'VNDR-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        // Custom Access Key Format: XP-[VENDOR_ID]-[RANDOM_4_DIGITS]
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const accessKey = `XP-${vendorId}-${randomDigits}`;

        const hashedAccessKey = await bcrypt.hash(accessKey, 10);
        const lookupKey = getLookupKey(accessKey);

        await db.run(`
            INSERT INTO vendors (vendor_id, access_key, lookup_key, brand_config, status)
            VALUES (?, ?, ?, ?, 'active')
        `, [vendorId, hashedAccessKey, lookupKey, typeof brandConfig === 'string' ? brandConfig : JSON.stringify(brandConfig || {})]);

        await logAudit('admin', 'SYSTEM', 'VENDOR_REGISTER', { vendorId, accessKey }, req.ip);

        res.json({ success: true, message: 'VENDOR REGISTERED SUCCESSFULLY', vendorId, accessKey });
    } catch (e) {
        console.error('POST /admin/vendors error:', e);
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vault/admin/vendor/status
router.post('/admin/vendor/status', authenticateAdmin, async (req, res) => {
    try {
        const schema = z.object({
            vendorId: z.string().min(2),
            status: z.enum(['active', 'suspended'])
        });
        const { vendorId, status } = schema.parse(req.body);
        if (!['active', 'suspended'].includes(status)) {
            return fail(res, 'XP_VAL_INVALID', 'INVALID_STATUS_VALUE');
        }

        await db.run('UPDATE vendors SET status = ? WHERE vendor_id = ?', [status, vendorId]);
        
        await logAudit('admin', 'SYSTEM', 'VENDOR_STATUS_CHANGE', { vendorId, status }, req.ip);

        res.json({ success: true, message: `VENDOR ${status.toUpperCase()} SUCCESSFULLY` });
    } catch (e) {
        if (e instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_STATUS_PARAMS', 400, e.errors);
        next(e);
    }
});

// DELETE /api/vault/admin/vendor/:vendorId
router.delete('/admin/vendor/:vendorId', authenticateAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;
        
        // Delete sensitivity keys first (due to FK)
        await db.run('DELETE FROM sensitivity_keys WHERE vendor_id = ?', [vendorId]);
        await db.run('DELETE FROM vendors WHERE vendor_id = ?', [vendorId]);
        
        res.json({ success: true, message: `VENDOR ${vendorId} DELETED PERMANENTLY` });
    } catch (e) {
        console.error('DELETE /admin/vendor error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// SSNE: Server-Side Neural Engine (10/10 Logic)
router.post('/calculate', async (req, res) => {
    try {
        const results = Calculator.compute(req.body);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: 'NEURAL_ENGINE_FAILURE' });
    }
});

router.post('/track', async (req, res) => {
    try {
        const { event_type, vendor_id, session_id, device } = req.body;
        const vendor = await db.get('SELECT org_id FROM vendors WHERE vendor_id = ?', [vendor_id]);
        await trackEvent(event_type, vendor ? vendor.org_id : 'XP-CORE-ORG', vendor_id, session_id, device);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'TRACK_ERR' });
    }
});

// POST /api/vault/feedback
router.post('/feedback', async (req, res) => {
    try {
        const schema = z.object({
            entry_code: z.string().min(1),
            rating: z.number().int().min(1).max(5),
            feedback_text: z.string().max(500).optional()
        });
        const { entry_code, rating, feedback_text } = schema.parse(req.body);

        // Find the most recent activity for this code (assuming the rater is the most recent user)
        const activity = await db.get('SELECT id FROM code_activity WHERE entry_code = ? ORDER BY used_at DESC LIMIT 1', [entry_code]);
        
        if (!activity) {
            return fail(res, 'XP_VAL_NOT_FOUND', 'SESSION_NOT_FOUND', 404);
        }

        await db.run('UPDATE code_activity SET rating = ?, feedback_text = ? WHERE id = ?', [rating, feedback_text || null, activity.id]);

        // Emit live event for feedback
        const io = req.app.get('io');
        if (io) {
            io.emit('live_event', {
                type: 'feedback',
                entry_code,
                rating,
                feedback: feedback_text || 'No comment'
            });
        }

        res.json({ success: true, message: 'FEEDBACK_LOGGED_SUCCESSFULLY' });
    } catch (e) {
        console.error('FEEDBACK_ERR:', e);
        res.status(500).json({ error: 'FEEDBACK_SYSTEM_ERROR' });
    }
});

module.exports = router;
router.get('/code/:code/status', async (req, res) => {
    try {
        const code = req.params.code;
        if (!code) return res.status(400).json({ error: 'Missing code' });
        const key = await db.get(`
            SELECT k.entry_code, k.vendor_id, k.usage_limit, k.current_usage, k.status, k.expires_at,
                   v.vendor_id as v_id, v.status as vendor_status, v.brand_config
            FROM sensitivity_keys k
            LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
            WHERE k.entry_code = ?
        `, [code]);
        if (!key) return res.status(404).json({ error: 'Not found' });
        const usage_total = await db.get('SELECT COUNT(*) as c FROM code_activity WHERE entry_code = ?', [code]);
        res.json({
            entry_code: key.entry_code,
            vendor_id: key.vendor_id,
            vendor_status: key.vendor_status,
            status: key.status,
            usage_limit: key.usage_limit,
            current_usage: key.current_usage,
            real_usage: usage_total ? usage_total.c : 0,
            expires_at: key.expires_at,
            branding: typeof key.brand_config === 'string' ? JSON.parse(key.brand_config) : key.brand_config
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/code/:entryCode/extend', authenticateVendor, async (req, res) => {
    try {
        const { hours } = req.body || {};
        const entryCode = req.params.entryCode;
        if (!hours || hours <= 0) return res.status(400).json({ error: 'Invalid hours' });
        const owner = await db.get('SELECT vendor_id FROM sensitivity_keys WHERE entry_code = ?', [entryCode]);
        if (!owner || owner.vendor_id !== req.vendorId) return res.status(404).json({ error: 'Not found' });
        const expires_at = new Date(Date.now() + hours * 60 * 60 * 1000);
        await db.run('UPDATE sensitivity_keys SET expires_at = ? WHERE entry_code = ?', [expires_at, entryCode]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/code/:entryCode/limit', authenticateVendor, async (req, res) => {
    try {
        const { limit } = req.body || {};
        const entryCode = req.params.entryCode;
        const n = limit === null ? null : parseInt(limit, 10);
        if (n !== null && (isNaN(n) || n < 0)) return res.status(400).json({ error: 'Invalid limit' });
        const owner = await db.get('SELECT vendor_id FROM sensitivity_keys WHERE entry_code = ?', [entryCode]);
        if (!owner || owner.vendor_id !== req.vendorId) return res.status(404).json({ error: 'Not found' });
        await db.run('UPDATE sensitivity_keys SET usage_limit = ? WHERE entry_code = ?', [n, entryCode]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/code/:entryCode/deactivate', authenticateVendor, async (req, res) => {
    try {
        const entryCode = req.params.entryCode;
        const owner = await db.get('SELECT vendor_id FROM sensitivity_keys WHERE entry_code = ?', [entryCode]);
        if (!owner || owner.vendor_id !== req.vendorId) return res.status(404).json({ error: 'Not found' });
        await db.run('UPDATE sensitivity_keys SET status = ? WHERE entry_code = ?', ['expired', entryCode]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});
