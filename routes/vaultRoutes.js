const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
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

function getJwtSecret() {
    return process.env.JWT_SECRET || getAdminSecret();
}

function getAdminSecret() {
    return process.env.ADMIN_SECRET || '';
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = (typeof forwarded === 'string' && forwarded.split(',')[0])
        || req.ip
        || req.connection?.remoteAddress
        || '';
    return rawIp.trim().replace('::ffff:', '');
}

function normalizeBranding(config) {
    if (!config) return {};
    const c = typeof config === 'string' ? JSON.parse(config) : config;
    const socials = c.socials || {};
    return {
        ...c,
        youtube: c.youtube || socials.yt || '',
        tiktok: c.tiktok || socials.tiktok || socials.tt || '',
        discord: c.discord || socials.discord || socials.dc || '',
        logo_url: c.logo_url || c.logo || ''
    };
}

function authenticateVendor(req, res, next) {
    (async () => {
        const token = req.cookies.xp_vendor_token || parseBearer(req.headers['authorization']);
        if (!token) return fail(res, 'XP_AUTH_UNAUTHORIZED', 'VENDOR_SESSION_REQUIRED', 401);
        let payload;
        try {
            payload = jwt.verify(token, getJwtSecret());
        } catch (_e) {
            return fail(res, 'XP_AUTH_INVALID', 'SESSION_EXPIRED_OR_CORRUPT', 401);
        }
        // Enforce vendor status and activation window
        try {
            const vendor = await db.get('SELECT status, active_until FROM vendors WHERE vendor_id = ?', [payload.vendor_id]);
            const now = new Date();
            const activeUntilOk = !vendor?.active_until || new Date(vendor.active_until) > now;
            if (!vendor || vendor.status !== 'active' || !activeUntilOk) {
                return fail(res, 'XP_AUTH_SUSPENDED', 'VENDOR_ACCOUNT_LOCKED_OR_EXPIRED', 403);
            }
            req.vendorId = payload.vendor_id;
            next();
        } catch (e) {
            return fail(res, 'XP_AUTH_INVALID', 'VENDOR_LOOKUP_FAILED', 401);
        }
    })();
}

async function checkSoftBan(req, res, next) {
    const ip = getClientIp(req);
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
        const adminSecret = getAdminSecret();
        if (!adminSecret) return res.status(503).json({ error: 'ADMIN_SECRET_NOT_CONFIGURED' });
        // IP Whitelist Check (10/10 Security)
        const whitelist = process.env.ADMIN_IP_WHITELIST;
        if (whitelist && whitelist !== '*') {
            const allowedIps = whitelist.split(',').map(ip => ip.trim()).filter(Boolean).map(ip => ip.replace('::ffff:', ''));
            const clientIp = getClientIp(req);
            if (!allowedIps.includes(clientIp)) {
                console.warn(`🚫 UNAUTHORIZED_IP_BLOCKED: ${clientIp}`);
                return res.status(403).json({ error: 'FORBIDDEN_IP' });
            }
        }

        const token = req.cookies.xp_admin_token || parseBearer(req.headers['authorization']);
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, adminSecret);
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

async function getGlobalOffset() {
    try {
        const row = await db.get("SELECT setting_value FROM system_settings WHERE setting_key = 'global_sensitivity_offset'");
        return row ? parseFloat(row.setting_value) : 1.0;
    } catch (e) {
        return 1.0;
    }
}

// POST /api/vault/action (Conversion Tracking)
router.post('/action', async (req, res) => {
    try {
        const schema = z.object({
            action: z.string(),
            code: z.string().optional()
        });
        const { action, code } = schema.parse(req.body);
        if (code) {
            console.log(`[CONVERSION TRACKING] Action: ${action} | Code: ${code}`);
            // Here you could update a `metrics` table:
            // await db.run('UPDATE vendor_analytics SET usages = usages + 1 WHERE lookup_key = ?', [getLookupKey(code)]);
        }
        res.json({ ok: 1 });
    } catch (e) {
        res.status(400).json({ error: 'invalid_event' });
    }
});

// POST /api/vault/verify
router.post('/verify', async (req, res) => {
    try {
        const schema = z.object({
            input: z.string().min(1),
            user_ign: z.string().optional(),
            user_region: z.string().optional()
        });
        const { input, user_ign, user_region } = schema.parse(req.body); 
        const adminSecret = getAdminSecret();
        const clientIp = getClientIp(req);

        if (!input) {
            return fail(res, 'XP_VAL_MISSING', 'ACCESS_CODE_REQUIRED', 400);
        }

        // 1. Check Master Admin Secret (BYPASS ALL MIDDLEWARE)
        if (adminSecret && input === adminSecret) {
            const token = jwt.sign({ role: 'admin' }, adminSecret, { expiresIn: '1d' });
            res.cookie('xp_admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });
            return res.json({
                type: 'admin',
                redirect: '/admin.html',
                message: 'MASTER ACCESS GRANTED'
            });
        }

        // 🛡️ Security Layer (Only for non-admin)
        await new Promise((resolve, reject) => {
            checkSoftBan(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // ⚡ HOT-CACHE CHECK
        const cached = HotCache.get(`verify_${input}`);
        if (cached) {
            console.log('⚡ HOT_CACHE_HIT:', input);
            return res.json(cached);
        }

        // 2. Fast Lookup Optimization (10/10 Logic)
        const prefix = getLookupKey(input);
        
        // 2a. Check Vendor Access Key (Fast Lookup)
        const vendor = await db.get('SELECT * FROM vendors WHERE lookup_key = ?', [prefix]);
        if (vendor) {
            if (await bcrypt.compare(input, vendor.access_key)) {
                const now = new Date();
                const activeWindow = !vendor.active_until || new Date(vendor.active_until) > now;
                if (vendor.status === 'suspended' || !activeWindow) {
                    return fail(res, 'XP_AUTH_SUSPENDED', 'PROVIDER_ACCESS_DENIED', 403);
                }
                const token = jwt.sign({ vendor_id: vendor.vendor_id }, getJwtSecret(), { expiresIn: '7d' });
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
            await trackEvent('landing_view', keyData.org_id, keyData.vendor_id, getClientIp(req), 'mobile');
            if (keyData.vendor_status === 'suspended') {
                return res.status(403).json({ error: 'PROVIDER UNAVAILABLE - ACCESS DENIED' });
            }
            const vendorWindow = await db.get('SELECT active_until FROM vendors WHERE vendor_id = ?', [keyData.vendor_id]);
            if (vendorWindow && vendorWindow.active_until && new Date(vendorWindow.active_until) < new Date()) {
                return res.status(403).json({ error: 'PROVIDER ACCESS WINDOW EXPIRED' });
            }
            
            if (keyData.status === 'expired' || (keyData.expires_at && new Date(keyData.expires_at) < new Date())) {
                return res.status(403).json({ error: 'KEY EXPIRED OR DEACTIVATED' });
            }

            if (keyData.usage_limit && keyData.current_usage >= keyData.usage_limit) {
                return res.status(403).json({ error: 'USAGE LIMIT REACHED' });
            }
            
            await db.run('UPDATE sensitivity_keys SET current_usage = current_usage + 1 WHERE id = ?', [keyData.id]);
            await db.run('INSERT INTO code_activity (entry_code, lookup_key, user_ign, user_region) VALUES (?, ?, ?, ?)', [input, prefix, user_ign || 'Anonymous', user_region || 'Unknown']);

            let finalResults = typeof keyData.results_json === 'string' ? JSON.parse(keyData.results_json) : keyData.results_json;
            if (keyData.custom_results_json) {
                const custom = typeof keyData.custom_results_json === 'string' ? JSON.parse(keyData.custom_results_json) : keyData.custom_results_json;
                finalResults = { ...finalResults, ...custom };
            }
            if (keyData.creator_advice) {
                finalResults = { ...finalResults, advice: keyData.creator_advice };
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

            const branding = normalizeBranding(keyData.brand_config);

            // HotCache Warmup
            HotCache.set(`verify_${input}`, {
                type: 'user',
                redirect: '/result.html',
                results: finalResults,
                branding,
                advice: keyData.creator_advice || null,
                message: 'CALIBRATION DATA RETRIEVED'
            });

            return res.json({
                type: 'user',
                redirect: '/result.html',
                results: finalResults,
                branding,
                advice: keyData.creator_advice || null,
                message: 'CALIBRATION DATA RETRIEVED'
            });
        }

        // 🛡️ AI Fraud Detection (Log Failure)
        await db.run('INSERT INTO security_logs (ip_address, event_type, details) VALUES (?, ?, ?)', 
            [clientIp, 'VERIFY_FAIL', JSON.stringify({ input_length: input.length })]);

        return res.status(404).json({ error: 'INVALID ACCESS KEY' });
    } catch (e) {
        console.error('Vault Verification Error:', e);
        let errorMsg = 'VAULT SYSTEM ERROR';
        if (e.message.includes('ECONNREFUSED') || e.message.includes('Access denied') || e.message.includes('connect')) {
            errorMsg = 'DATABASE DISCONNECTED: Please configure remote Database Environment Variables in Vercel.';
        } else if (e.message.includes('Table')) {
            errorMsg = 'DATABASE MIGRATION REQUIRED: Tables do not exist in the remote database.';
        } else {
            errorMsg = `VAULT SYSTEM ERROR: ${e.message}`;
        }
        res.status(500).json({ error: errorMsg });
    }
});

router.post('/admin/login', async (req, res, next) => {
    try {
        const adminSecret = getAdminSecret();
        if (!adminSecret) return res.status(503).json({ error: 'ADMIN_SECRET_NOT_CONFIGURED' });
        const schema = z.object({ password: z.string().min(4) });
        const { password } = schema.parse(req.body || {});
        if (!password) return res.status(400).json({ error: 'Missing password' });
        if (password !== adminSecret) return res.status(401).json({ error: 'Unauthorized' });
        const token = jwt.sign({ role: 'admin' }, adminSecret, { expiresIn: '1d' });
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

        const token = jwt.sign({ vendor_id: matchedVendor.vendor_id }, getJwtSecret(), { expiresIn: '7d' });
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
router.post('/generate', authenticateVendor, async (req, res, next) => {
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
                display_name: z.string().optional(),
                logo: z.string().optional(),
                logo_url: z.string().optional(),
                colors: z.object({ primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/) }).optional(),
                socials: z.object({
                    yt: z.string().optional(),
                    ig: z.string().optional(),
                    tiktok: z.string().optional(),
                    discord: z.string().optional()
                }).optional(),
                youtube: z.string().optional(),
                tiktok: z.string().optional(),
                discord: z.string().optional()
            }).optional(),
            // Legacy flat payload support from vendor_dashboard.html
            display_name: z.string().optional(),
            logo_url: z.string().optional(),
            youtube: z.string().optional(),
            tiktok: z.string().optional(),
            discord: z.string().optional(),
            webhook_url: z.string().url().nullable().optional()
        });
        const { brand_config, webhook_url, display_name, logo_url, youtube, tiktok, discord } = schema.parse(req.body);
        const vendorId = req.vendorId;

        let mergedBrandConfig = brand_config || null;
        if (!mergedBrandConfig && (display_name || logo_url || youtube || tiktok || discord)) {
            const current = await db.get('SELECT brand_config FROM vendors WHERE vendor_id = ?', [vendorId]);
            const currentConfig = current?.brand_config
                ? (typeof current.brand_config === 'string' ? JSON.parse(current.brand_config) : current.brand_config)
                : {};
            mergedBrandConfig = {
                ...currentConfig,
                display_name: display_name ?? currentConfig.display_name,
                logo_url: logo_url ?? currentConfig.logo_url,
                youtube: youtube ?? currentConfig.youtube,
                tiktok: tiktok ?? currentConfig.tiktok,
                discord: discord ?? currentConfig.discord
            };
        }
        if (mergedBrandConfig) {
            await db.run('UPDATE vendors SET brand_config = ? WHERE vendor_id = ?', [JSON.stringify(mergedBrandConfig), vendorId]);
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

// GET /api/vault/org/stats
router.get('/org/stats', async (req, res) => {
    try {
        const events = await db.all(`
            SELECT event_type, COUNT(*) as count 
            FROM user_events 
            GROUP BY event_type
        `);
        
        const counts = {
            landing_view: 0,
            calibration_start: 0,
            code_generated: 0,
            result_view: 0
        };
        
        events.forEach(e => {
            if (counts.hasOwnProperty(e.event_type)) {
                counts[e.event_type] = e.count;
            }
        });

        const vendors = await db.get('SELECT COUNT(*) as count FROM vendors');
        const codes = await db.get('SELECT COUNT(*) as count FROM sensitivity_keys');

        res.json({
            vendors: vendors.count,
            codes: codes.count,
            funnel: [
                { label: 'LANDING VIEWS', val: counts.landing_view },
                { label: 'CALIBRATIONS', val: counts.calibration_start },
                { label: 'CODE_PROVISIONED', val: counts.code_generated },
                { label: 'RESULT_HITS', val: counts.result_view }
            ]
        });
    } catch (e) {
        console.error('ORG_STATS_ERR:', e);
        res.status(500).json({ error: 'ORG_STATS_UNAVAILABLE' });
    }
});

// GET /api/vault/org/creators
router.get('/org/creators', async (req, res) => {
    try {
        const creators = await db.all(`
            SELECT v.vendor_id as name, 
            (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = v.vendor_id) as keys,
            (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.entry_code = sk.entry_code WHERE sk.vendor_id = v.vendor_id) as clicks
            FROM vendors v
            LIMIT 10
        `);
        res.json(creators);
    } catch (e) {
        res.status(500).json({ error: 'CREATOR_DATA_ERR' });
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
                (SELECT AVG(feedback_rating) FROM code_activity WHERE feedback_rating IS NOT NULL) as global_accuracy
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
            (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key WHERE sk.vendor_id = v.vendor_id) as total_usage
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
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
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
            orgId: z.string().optional(),
            usageLimit: z.number().int().positive().nullable().optional(),
            brandConfig: z.record(z.any()).optional()
        });
        const { vendorId: requestedId, orgId, usageLimit, brandConfig } = schema.parse(req.body);
        
        // Generate Vendor ID if not provided, or clean up provided one
        const normalizedRequestedId = requestedId
            ? requestedId.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
            : '';
        const vendorId = normalizedRequestedId || 'VNDR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        if (vendorId.length < 2) return res.status(400).json({ error: 'INVALID_VENDOR_ID' });

        const existing = await db.get('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (existing) return res.status(409).json({ error: 'VENDOR_ALREADY_EXISTS' });

        // Custom Access Key Format: XP-[VENDOR_ID]-[RANDOM_4_DIGITS]
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const accessKey = `XP-${vendorId}-${randomDigits}`;

        const hashedAccessKey = await bcrypt.hash(accessKey, 10);
        const lookupKey = getLookupKey(accessKey);

        // Ensure core org row exists before FK-bound vendor insert
        await db.run(
            "INSERT IGNORE INTO organizations (org_id, org_name) VALUES ('XP-CORE-ORG', 'XP ARENA GLOBAL')"
        );

        await db.run(`
            INSERT INTO vendors (org_id, vendor_id, access_key, lookup_key, usage_limit, brand_config, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        `, [orgId || 'XP-CORE-ORG', vendorId, hashedAccessKey, lookupKey, usageLimit || null, typeof brandConfig === 'string' ? brandConfig : JSON.stringify(brandConfig || {})]);

        await logAudit('admin', 'SYSTEM', 'VENDOR_REGISTER', { vendorId, accessKey }, getClientIp(req));

        res.json({ success: true, message: 'VENDOR REGISTERED SUCCESSFULLY', vendorId, accessKey });
    } catch (e) {
        console.error('POST /admin/vendors error:', e);
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'VENDOR_ALREADY_EXISTS' });
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vault/admin/vendor/status
router.post('/admin/vendor/status', authenticateAdmin, async (req, res, next) => {
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
        
        await logAudit('admin', 'SYSTEM', 'VENDOR_STATUS_CHANGE', { vendorId, status }, getClientIp(req));

        res.json({ success: true, message: `VENDOR ${status.toUpperCase()} SUCCESSFULLY` });
    } catch (e) {
        if (e instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_STATUS_PARAMS', 400, e.errors);
        next(e);
    }
});

// POST /api/vault/admin/vendor/activate_until
router.post('/admin/vendor/activate_until', authenticateAdmin, async (req, res) => {
    try {
        const schema = z.object({
            vendorId: z.string().min(2),
            hours: z.number().int().positive().max(24 * 365).optional(),
            until: z.string().datetime().optional()
        }).refine(d => d.hours || d.until, 'Provide hours or until');
        const { vendorId, hours, until } = schema.parse(req.body);
        let activeUntil = null;
        if (until) {
            activeUntil = new Date(until);
        } else if (hours) {
            activeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
        }
        await db.run('UPDATE vendors SET status = ?, active_until = ? WHERE vendor_id = ?', ['active', activeUntil, vendorId]);
        await logAudit('admin', 'SYSTEM', 'VENDOR_ACTIVATE_TIMED', { vendorId, active_until: activeUntil }, getClientIp(req));
        res.json({ success: true, active_until: activeUntil?.toISOString() || null });
    } catch (e) {
        if (e instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_ACTIVATE_PARAMS', 400, e.errors);
        res.status(500).json({ error: 'Server error' });
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

// Backward-compat alias for clients calling plural endpoint
router.delete('/admin/vendors/:vendorId', authenticateAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;
        await db.run('DELETE FROM sensitivity_keys WHERE vendor_id = ?', [vendorId]);
        await db.run('DELETE FROM vendors WHERE vendor_id = ?', [vendorId]);
        res.json({ success: true, message: `VENDOR ${vendorId} DELETED PERMANENTLY` });
    } catch (e) {
        console.error('DELETE /admin/vendors error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin System Settings
router.get('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = await db.all('SELECT * FROM system_settings');
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: 'SETTINGS_UNAVAILABLE' });
    }
});

router.post('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const schema = z.object({
            key: z.string(),
            value: z.string()
        });
        const { key, value } = schema.parse(req.body);
        
        await db.run('REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
        
        await logAudit('admin', 'SYSTEM', 'SETTING_CHANGE', { key, value }, getClientIp(req));
        res.json({ success: true, message: 'SETTING_UPDATED' });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'SETTINGS_UPDATE_FAILED' });
    }
});

// SSNE: Server-Side Neural Engine (10/10 Logic)
router.post('/calculate', async (req, res) => {
    try {
        const offset = await getGlobalOffset();
        const results = Calculator.compute(req.body, offset);
        
        // ⚡ 10/10 Logic: Generate a persistent Master Code for every calculation
        const entry_code = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCode = await bcrypt.hash(entry_code, 10);
        const lookupKey = getLookupKey(entry_code);

        await db.run(`
            INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, status, current_usage)
            VALUES (?, ?, 'XP-PUBLIC', ?, 'active', 1)
        `, [hashedCode, lookupKey, JSON.stringify(results)]);

        // Log initial activity
        await db.run('INSERT INTO code_activity (entry_code, lookup_key, user_ign, user_region) VALUES (?, ?, ?, ?)', 
            [entry_code, lookupKey, req.body.ign || 'Guest', req.body.rank || 'Global']);

        res.json({ results, entry_code });
    } catch (e) {
        console.error('CALC_ERR:', e);
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

router.get('/admin/live-feed', authenticateAdmin, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT ca.used_at as ts, ca.user_ign, ca.user_region, ca.feedback_rating, ca.feedback_comment,
                   sk.vendor_id
            FROM code_activity ca
            LEFT JOIN sensitivity_keys sk ON sk.lookup_key = ca.lookup_key
            ORDER BY ca.used_at DESC
            LIMIT 30
        `);
        const events = rows.map(r => ({
            type: r.feedback_rating ? 'feedback' : 'verify',
            timestamp: r.ts,
            vendor_id: r.vendor_id || 'XP-CORE',
            user_ign: r.user_ign || 'Anonymous',
            region: r.user_region || 'Unknown',
            rating: r.feedback_rating || null,
            feedback: r.feedback_comment || null
        }));
        res.json(events);
    } catch (e) {
        console.error('LIVE_FEED_ERR:', e);
        res.status(500).json({ error: 'LIVE_FEED_UNAVAILABLE' });
    }
});

router.get('/admin/security-logs', authenticateAdmin, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT id, ip_address, event_type, details, created_at
            FROM security_logs
            ORDER BY created_at DESC
            LIMIT 100
        `);
        res.json(logs);
    } catch (e) {
        console.error('SECURITY_LOGS_ERR:', e);
        res.status(500).json({ error: 'SECURITY_LOGS_UNAVAILABLE' });
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
        const lookupKey = crypto.createHash('sha1').update(entry_code).digest('hex').substring(0, 10);
        const activity = await db.get('SELECT id FROM code_activity WHERE lookup_key = ? ORDER BY used_at DESC LIMIT 1', [lookupKey]);
        
        if (!activity) {
            return fail(res, 'XP_VAL_NOT_FOUND', 'SESSION_NOT_FOUND', 404);
        }

        await db.run('UPDATE code_activity SET feedback_rating = ?, feedback_comment = ? WHERE id = ?', [rating, feedback_text || null, activity.id]);

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
        const lookupKey = crypto.createHash('sha1').update(code).digest('hex').substring(0, 10);
        const key = await db.get(`
            SELECT k.lookup_key, k.vendor_id, k.usage_limit, k.current_usage, k.status, k.expires_at,
                   v.vendor_id as v_id, v.status as vendor_status, v.brand_config
            FROM sensitivity_keys k
            LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
            WHERE k.lookup_key = ?
        `, [lookupKey]);
        if (!key) return res.status(404).json({ error: 'Not found' });
        const usage_total = await db.get('SELECT COUNT(*) as c FROM code_activity WHERE lookup_key = ?', [lookupKey]);
        res.json({
            lookup_key: key.lookup_key,
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
router.get('/vendor/profile', authenticateVendor, async (req, res) => {
    try {
        const vendor = await db.get('SELECT vendor_id, status, active_until, brand_config, webhook_url FROM vendors WHERE vendor_id = ?', [req.vendorId]);
        const stats = await db.get(`
            SELECT COUNT(*) as codes, SUM(current_usage) as hits
            FROM sensitivity_keys 
            WHERE vendor_id = ?
        `, [req.vendorId]);
        const config = vendor?.brand_config
            ? (typeof vendor.brand_config === 'string' ? JSON.parse(vendor.brand_config) : vendor.brand_config)
            : {};
        
        res.json({
            vendor_id: vendor.vendor_id,
            status: vendor.status,
            active_until: vendor.active_until,
            total_codes: stats.codes || 0,
            total_hits: stats.hits || 0,
            display_name: config.display_name || '',
            logo_url: config.logo_url || config.logo || '',
            youtube: config.youtube || config?.socials?.yt || '',
            tiktok: config.tiktok || config?.socials?.tiktok || '',
            discord: config.discord || config?.socials?.discord || '',
            webhook_url: vendor.webhook_url || ''
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/vendor/stats', authenticateVendor, async (req, res) => {
    try {
        const stats = await db.all(`
            SELECT DATE(used_at) as date, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys k ON ca.lookup_key = k.lookup_key
            WHERE k.vendor_id = ?
            AND used_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(used_at)
            ORDER BY date ASC
        `, [req.vendorId]);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/vendor/generate', authenticateVendor, async (req, res) => {
    try {
        const { brand, series, model, ram, speed, claw } = req.body;
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const accessKey = `XP-${req.vendorId.toUpperCase()}-${code}`;
        const lookupKey = getLookupKey(accessKey);
        const hashed = await bcrypt.hash(accessKey, 10);
        
        const globalOffset = await getGlobalOffset();
        
        // 🧪 Precision Calibration Engine
        let results;
        if (brand && model) {
            results = Calculator.compute({
                brand,
                series,
                model,
                ram: ram || 8,
                speed: speed || 'balanced',
                claw: claw || '2',
                neuralScale: 5.0 + (Math.random() * 2 - 1) // Slight natural variance
            }, globalOffset);
        } else {
            // Fallback for legacy calls
            results = {
                formula_version: Calculator.version,
                general: Math.round((94 + Math.floor(Math.random() * 6)) * globalOffset),
                redDot: Math.round((90 + Math.floor(Math.random() * 8)) * globalOffset),
                scope2x: 85,
                scope4x: 82,
                sniper: 50,
                freeLook: 100,
                dpi: "440-480",
                fireButton: "62-66"
            };
        }

        await db.run(`
            INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, status)
            VALUES (?, ?, ?, ?, 'active')
        `, [hashed, lookupKey, req.vendorId, JSON.stringify(results)]);

        res.json({ accessKey });
    } catch (e) {
        console.error('GEN_ERR:', e);
        res.status(500).json({ error: 'VAULT_GENERATION_FAILED' });
    }
});

router.post('/vendor/manual-entry', authenticateVendor, async (req, res) => {
    try {
        const schema = z.object({
            general: z.number().min(0).max(200),
            redDot: z.number().min(0).max(200),
            scope2x: z.number().min(0).max(200),
            scope4x: z.number().min(0).max(200),
            sniper: z.number().min(0).max(200),
            freeLook: z.number().min(0).max(200),
            advice: z.string().max(500).optional()
        });
        const data = schema.parse(req.body);
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const accessKey = `XP-${req.vendorId.toUpperCase()}-${code}`;
        const lookupKey = getLookupKey(accessKey);
        const hashed = await bcrypt.hash(accessKey, 10);

        const results = {
            formula_version: Calculator.version,
            brand: 'MANUAL',
            model: 'PRESET',
            general: data.general,
            redDot: data.redDot,
            scope2x: data.scope2x,
            scope4x: data.scope4x,
            sniper: data.sniper,
            freeLook: data.freeLook,
            dpi: 600, // Default
            fireButton: 50 // Default
        };

        await db.run(`
            INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, creator_advice, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `, [hashed, lookupKey, req.vendorId, JSON.stringify(results), data.advice]);

        res.json({ accessKey });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});
