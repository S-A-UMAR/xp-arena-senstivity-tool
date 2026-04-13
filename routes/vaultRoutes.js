const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db');
const Calculator = require('../lib/calculator');

const router = express.Router();


const REQUIRED_COLUMN_LENGTHS = {
    vendors: { access_key: 100, lookup_key: 20 },
    sensitivity_keys: { entry_code: 100, lookup_key: 16 },
    code_activity: { entry_code: 100, lookup_key: 16 }
};
const RUNTIME_SCHEMA_ALTER_ENABLED = process.env.ALLOW_RUNTIME_SCHEMA_ALTER === 'true';
const FEEDBACK_ALLOWED_TAGS = ['too_high', 'too_low', 'feels_good', 'device_mismatch', 'scope_unstable'];
const FEEDBACK_SOURCES = ['quick_like', 'structured_feedback', 'share_card', 'result_page'];
const FEEDBACK_COOLDOWN_SECONDS = 6 * 60 * 60;

const diagnosticSchema = z.object({
    avg_reaction_ms: z.number().int().min(50).max(2000),
    precision_score: z.number().int().min(0).max(100),
    raw_data: z.record(z.any()).optional()
});

let schemaCapacityCheckedAt = 0;
let schemaCapacityPromise = null;

async function ensureKeyStorageCapacity(options = {}) {
    // ⚡ DISABLED: information_schema queries cause 500 errors on restricted serverless environments.
    return Promise.resolve();
}

if (process.env.NODE_ENV !== 'test') {
    ensureKeyStorageCapacity().catch(() => {});
}

router.use(async (_req, _res, next) => {
    try {
        if (typeof db.clearExpiredCache === 'function' && Math.random() < 0.1) {
            await db.clearExpiredCache();
        }
    } catch (_err) {}
    next();
});

function getLookupKey(code) {
    return crypto.createHash('sha1').update(String(code)).digest('hex').substring(0, 10);
}

function getFeedbackFingerprint(req, lookupKey = '') {
    const ua = String(req.headers['user-agent'] || 'unknown-agent');
    return crypto
        .createHash('sha256')
        .update(`${getClientIp(req)}|${ua}|${lookupKey}`)
        .digest('hex')
        .substring(0, 32);
}

function fail(res, code, message, status = 400, details = null) {
    return res.status(status).json({ code, message, details });
}

function parseBearer(header) {
    if (!header) return null;
    const parts = header.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
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
    const parsed = typeof config === 'string' ? JSON.parse(config) : config;
    const socials = parsed.socials || {};
    return {
        ...parsed,
        youtube: parsed.youtube || socials.yt || '',
        tiktok: parsed.tiktok || socials.tiktok || socials.tt || '',
        discord: parsed.discord || socials.discord || socials.dc || '',
        logo_url: parsed.logo_url || parsed.logo || ''
    };
}

function jsonOrObject(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (_err) {
            return fallback;
        }
    }
    return value;
}

async function getAdminSecret() {
    try {
        const row = await db.get("SELECT setting_value FROM system_settings WHERE setting_key = 'admin_secret'");
        if (row?.setting_value) return row.setting_value;
    } catch (_err) {}
    return process.env.ADMIN_SECRET || '';
}

async function getJwtSecret() {
    const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
    if (secret) return secret;
    const dbSecret = await getAdminSecret();
    if (dbSecret) return dbSecret;
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
}

async function createShareToken(entryCode) {
    const lookupKey = getLookupKey(entryCode);
    const now = new Date();
    const expiresAt = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000));
    let shareId = null;

    try {
        const existing = await db.get(
            'SELECT share_id FROM share_tokens WHERE lookup_key = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
            [lookupKey, now]
        );
        shareId = existing?.share_id || null;
    } catch (_err) {}

    if (!shareId) {
        shareId = crypto.randomBytes(12).toString('hex');
        try {
            await db.run(
                'INSERT INTO share_tokens (share_id, lookup_key, expires_at) VALUES (?, ?, ?)',
                [shareId, lookupKey, expiresAt]
            );
        } catch (_err) {}
    }

    return jwt.sign(
        { type: 'share', sid: shareId, lookup_key: lookupKey },
        await getJwtSecret(),
        { expiresIn: '14d' }
    );
}

async function getCodeRecordFromShareToken(shareToken) {
    const payload = jwt.verify(shareToken, await getJwtSecret());
    if (payload?.type !== 'share' || !payload?.sid) {
        throw new Error('INVALID_SHARE_TOKEN');
    }
    const shareRecord = await db.get(
        'SELECT share_id, lookup_key, revoked_at, expires_at FROM share_tokens WHERE share_id = ? LIMIT 1',
        [payload.sid]
    );
    if (!shareRecord || shareRecord.revoked_at) {
        throw new Error('INVALID_SHARE_TOKEN');
    }
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) <= new Date()) {
        throw new Error('INVALID_SHARE_TOKEN');
    }
    await db.run(
        'UPDATE share_tokens SET last_accessed_at = ?, access_count = access_count + 1 WHERE share_id = ?',
        [new Date(), payload.sid]
    ).catch(() => {});
    return getCodeRecordByLookupKey(shareRecord.lookup_key || payload.lookup_key || '');
}






async function getGlobalOffset() {
    try {
        const row = await db.get("SELECT setting_value FROM system_settings WHERE setting_key = 'global_sensitivity_offset'");
        return row ? parseFloat(row.setting_value) || 1.0 : 1.0;
    } catch (_err) {
        return 1.0;
    }
}

async function trackEvent(type, orgId, vendorId, session, device) {
    try {
        // user_events table is purged. Logging to audit_logs for critical events.
        if (['code_generated', 'verify_success'].includes(type)) {
            await logAudit('system', vendorId, `TRACK_${type.toUpperCase()}`, { orgId, session, device }, '0.0.0.0');
        }
    } catch (err) {
        console.error('EVENT_TRACK_ERR:', err);
    }
}

async function logAudit(actorType, actorId, action, details, ip) {
    try {
        await db.run(`
            INSERT INTO audit_logs (actor_type, actor_id, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `, [actorType, actorId, action, JSON.stringify(details || {}), ip]);
    } catch (err) {
        console.error('AUDIT_LOG_ERR:', err);
    }
}

async function dispatchVendorWebhook(vendorId, eventType, data) {
    try {
        const account = await db.get('SELECT webhook_url FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (!account?.webhook_url || typeof fetch !== 'function') return;
        await fetch(account.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: eventType,
                source: 'XP_ARENA_NEURAL_VAULT',
                timestamp: new Date().toISOString(),
                data
            })
        });
    } catch (err) {
        console.error('WEBHOOK_DISPATCH_ERR:', err.message);
    }
}

async function checkSoftBan(req, res, next) {
    try {
        const recentFailures = await db.get(`
            SELECT COUNT(*) as count FROM security_logs
            WHERE ip_address = ? AND event_type = 'VERIFY_FAIL'
            AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        `, [getClientIp(req)]);
        if ((recentFailures?.count || 0) >= 5) {
            return res.status(429).json({ error: 'SYSTEM_TEMPORARILY_LOCKED_FOR_SECURITY' });
        }
    } catch (_err) {}
    return next();
}

async function authenticateAdmin(req, res, next) {
    try {
        const adminSecret = await getAdminSecret();
        if (!adminSecret) return res.status(503).json({ error: 'ADMIN_SECRET_NOT_CONFIGURED' });

        const whitelist = process.env.ADMIN_IP_WHITELIST;
        if (whitelist && whitelist !== '*') {
            const allowedIps = whitelist.split(',').map((ip) => ip.trim().replace('::ffff:', '')).filter(Boolean);
            if (!allowedIps.includes(getClientIp(req))) {
                return res.status(403).json({ error: 'FORBIDDEN_IP' });
            }
        }

        const token = req.cookies.xp_admin_token || parseBearer(req.headers.authorization);
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, adminSecret);
        if (payload.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
        return next();
    } catch (_err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

async function authenticateVendor(req, res, next) {
    try {
        const token = req.cookies.xp_vendor_token || parseBearer(req.headers.authorization);
        if (!token) return fail(res, 'XP_AUTH_UNAUTHORIZED', 'VENDOR_SESSION_REQUIRED', 401);

        const payload = jwt.verify(token, await getJwtSecret());
        const vendor = await db.get('SELECT vendor_id, status, tier, active_until FROM vendors WHERE vendor_id = ?', [payload.vendor_id]);
        if (!vendor) return fail(res, 'XP_AUTH_INVALID', 'VENDOR_PROFILE_DELETED', 401);

        if (vendor.status !== 'active') {
            return fail(res, 'XP_AUTH_SUSPENDED', `VENDOR_ACCOUNT_SUSPENDED`, 403);
        }

        const now = new Date();
        if (vendor.active_until && new Date(vendor.active_until) < now) {
            return fail(res, 'XP_AUTH_EXPIRED', 'VENDOR_SUBSCRIPTION_EXPIRED', 403);
        }

        try {
            await db.run('UPDATE vendors SET last_login_at = ? WHERE vendor_id = ?', [now, payload.vendor_id]);
        } catch (_err) {}

        req.vendorId = payload.vendor_id;
        return next();
    } catch (err) {
        console.error('AUTH_VENDOR_ERR:', err);
        return fail(res, 'XP_AUTH_INVALID', 'SESSION_EXPIRED_OR_CORRUPT', 401);
    }
}

async function buildVerificationPayload(keyData, rawCode = null, options = {}) {
    const {
        includeEntryCode = true,
        includeShareToken = Boolean(rawCode),
        shareTokenOverride = null,
        redirectOverride = null
    } = options;
    let finalResults = jsonOrObject(keyData.results_json, {});
    const custom = jsonOrObject(keyData.custom_results_json, null);
    if (custom) finalResults = { ...finalResults, ...custom };
    if (keyData.creator_advice) finalResults = { ...finalResults, advice: keyData.creator_advice };

    const branding = normalizeBranding(keyData.brand_config);
    const vendor = keyData.vendor_id
        ? await db.get('SELECT tier, active_until FROM vendors WHERE vendor_id = ?', [keyData.vendor_id])
        : null;
    const likesRow = await db.get('SELECT COUNT(*) as likes FROM code_activity WHERE lookup_key = ? AND feedback_rating IS NOT NULL', [keyData.lookup_key]);

    const shareToken = shareTokenOverride || (includeShareToken && rawCode ? await createShareToken(rawCode) : null);
    const redirect = redirectOverride || (shareToken
        ? `/result.html?share=${encodeURIComponent(shareToken)}`
        : (rawCode ? `/result.html?code=${encodeURIComponent(rawCode)}` : '/result.html'));
    return {
        type: 'code',
        redirect,
        entry_code: includeEntryCode ? (rawCode || null) : null,
        vendor_id: keyData.vendor_id,
        display_name: branding.display_name || keyData.vendor_id || 'XP_CORE',
        sensitivity: finalResults,
        results: finalResults,
        branding,
        advice: keyData.creator_advice || finalResults.advice || null,
        likes: likesRow?.likes || 0,
        created_at: keyData.created_at || null,
        valid_until: keyData.expires_at || vendor?.active_until || null,
        usage_count: keyData.current_usage || 0,
        usage_limit: keyData.usage_limit ?? vendor?.usage_limit ?? null,
        social_links: {
            youtube: branding.youtube || '',
            tiktok: branding.tiktok || '',
            discord: branding.discord || ''
        },
        share_token: shareToken
    };
}

async function getCodeRecordByRawCode(rawCode) {
    const lookupKey = getLookupKey(rawCode);
    const found = await getCodeRecordByLookupKey(lookupKey);
    if (!found) return null;
    const isMatch = await bcrypt.compare(rawCode, found.keyData.entry_code);
    if (!isMatch) return null;
    return found;
}

async function getCodeRecordByLookupKey(lookupKey) {
    if (!lookupKey) return null;
    const keyData = await db.get(`
        SELECT k.*, v.status as vendor_status, v.brand_config, v.active_until, v.tier as vendor_tier, v.org_id
        FROM sensitivity_keys k
        LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
        WHERE k.lookup_key = ?
    `, [lookupKey]);
    if (!keyData) return null;
    return { keyData, lookupKey };
}

async function getCodeStatusPayload(rawCode) {
    const found = await getCodeRecordByRawCode(rawCode);
    if (!found) return null;
    const { keyData, lookupKey } = found;
    const payload = await buildVerificationPayload(keyData, rawCode);
    return {
        ...payload,
        status: keyData.status,
        vendor_status: keyData.vendor_status,
        lookup_key: lookupKey,
        current_usage: keyData.current_usage || 0,
        real_usage: keyData.current_usage || 0,
        expires_at: keyData.expires_at || null
    };
}

async function getCodeStatusFromShareToken(shareToken) {
    const found = await getCodeRecordFromShareToken(shareToken);
    if (!found) return null;
    const { keyData, lookupKey } = found;
    const payload = await buildVerificationPayload(keyData, null, {
        includeEntryCode: false,
        includeShareToken: true,
        shareTokenOverride: shareToken,
        redirectOverride: `/result.html?share=${encodeURIComponent(shareToken)}`
    });
    return {
        ...payload,
        status: keyData.status,
        vendor_status: keyData.vendor_status,
        lookup_key: lookupKey,
        current_usage: keyData.current_usage || 0,
        real_usage: keyData.current_usage || 0,
        expires_at: keyData.expires_at || null
    };
}

async function createVendorCode(vendorId, results, creatorAdvice = null, preferredCode = null) {
    await ensureKeyStorageCapacity();
    const rawCode = preferredCode || `XP-${vendorId.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const lookupKey = getLookupKey(rawCode);
    const hashedCode = await bcrypt.hash(rawCode, 10);

    await db.run(`
        INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, creator_advice, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    `, [hashedCode, lookupKey, vendorId, JSON.stringify(results), creatorAdvice]);

    // Audit Logging Upgrade
    await logAudit('vendor', vendorId, 'CODE_GENERATED', { lookupKey });

    return { accessKey: rawCode, lookupKey };
}

async function ensureSystemVendor(vendorId, displayName = vendorId) {
    const existing = await db.get('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorId]);
    if (existing?.vendor_id) return vendorId;

    const adminSecret = await getAdminSecret();
    const seedSecret = adminSecret || process.env.ADMIN_SECRET || `${vendorId}-SEED`;
    const hashed = await bcrypt.hash(seedSecret, 10);
    await db.run(`
        INSERT INTO vendors (org_id, vendor_id, access_key, lookup_key, brand_config, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    `, [
        'XP-CORE-ORG',
        vendorId,
        hashed,
        getLookupKey(`${vendorId}:${seedSecret}`).substring(0, 20),
        JSON.stringify({ display_name: displayName, logo_url: '', socials: {} })
    ]);
    return vendorId;
}

const vendorProfileSchema = z.object({
    display_name: z.string().max(100).optional(),
    logo_url: z.string().max(1000).optional(),
    youtube: z.string().max(500).optional(),
    tiktok: z.string().max(500).optional(),
    discord: z.string().max(500).optional(),
    social_link: z.string().max(500).optional(),
    colors: z.object({
        primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
        secondary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional()
    }).optional(),
    css_vars: z.record(z.string()).optional(),
    webhook_url: z.string().url().nullable().optional(),
    brand_config: z.record(z.any()).optional()
});

async function updateVendorProfile(vendorId, payload) {
    const parsed = vendorProfileSchema.parse(payload || {});
    const current = await db.get('SELECT brand_config, webhook_url FROM vendors WHERE vendor_id = ?', [vendorId]);
    const currentConfig = normalizeBranding(current?.brand_config || {});
    const incomingConfig = parsed.brand_config ? jsonOrObject(parsed.brand_config, {}) : {};
    const mergedConfig = {
        ...currentConfig,
        ...incomingConfig,
        display_name: parsed.display_name ?? incomingConfig.display_name ?? currentConfig.display_name,
        logo_url: parsed.logo_url ?? incomingConfig.logo_url ?? currentConfig.logo_url,
        youtube: parsed.youtube ?? incomingConfig.youtube ?? currentConfig.youtube,
        tiktok: parsed.tiktok ?? incomingConfig.tiktok ?? currentConfig.tiktok,
        discord: parsed.discord ?? incomingConfig.discord ?? currentConfig.discord,
        social_link: parsed.social_link ?? incomingConfig.social_link ?? currentConfig.social_link,
        colors: {
            ...(currentConfig.colors || {}),
            ...(incomingConfig.colors || {}),
            ...(parsed.colors || {})
        },
        css_vars: {
            ...(currentConfig.css_vars || {}),
            ...(incomingConfig.css_vars || {}),
            ...(parsed.css_vars || {})
        }
    };

    const webhookUrl = parsed.webhook_url === undefined ? (current?.webhook_url ?? null) : parsed.webhook_url;
    await db.run('UPDATE vendors SET brand_config = ?, webhook_url = ? WHERE vendor_id = ?', [
        JSON.stringify(mergedConfig),
        webhookUrl,
        vendorId
    ]);

    return { success: true, brand_config: mergedConfig };
}

// --- VENDOR CORE ENDPOINTS ---

// --- VENDOR ENDPOINTS ---

router.post('/vendor/generate', authenticateVendor, async (req, res) => {
    try {
        const { brand, model, ram, playstyle, claw } = z.object({
            brand: z.string().min(1),
            model: z.string().min(1),
            ram: z.string().min(1),
            playstyle: z.string().optional(),
            claw: z.string().optional()
        }).parse(req.body);

        const results = Calculator.compute({ brand, model, ram, speed: playstyle, claw });
        const { accessKey } = await createVendorCode(req.vendorId, results);

        return res.json({ success: true, code: accessKey });
    } catch (err) {
        console.error('VENDOR_GEN_ERR:', err);
        return res.status(500).json({ error: 'GENERATION_FAILED' });
    }
});

// Consolidated Vendor Profile Handlers


// Consolidated Stats Handler
router.get('/vendor/legacy-stats', authenticateVendor, async (req, res) => {
    return res.json({ success: true, message: 'Use /vendor/stats for detailed analytics' });
});
// Legacy event creation purged

// --- PUBLIC PULSE & SOCIAL PROOF ---

router.get('/public/pulse', async (req, res) => {
    try {
        const cached = await db.getCache('public_pulse');
        if (cached) return res.json({ success: true, pulse: cached });

        const activities = await db.all(`
            SELECT user_ign, user_region, used_at, lookup_key 
            FROM code_activity 
            ORDER BY used_at DESC LIMIT 15
        `);

        const pulse = activities.map(a => {
            const ign = String(a.user_ign || 'Anonymous');
            const maskedIgn = ign.length > 2 ? `${ign[0]}${'*'.repeat(ign.length - 2)}${ign[ign.length-1]}` : ign;
            return {
                ign: maskedIgn,
                region: a.user_region || 'GLB',
                timestamp: a.used_at,
                type: 'DECRYPTION'
            };
        });

        await db.setCache('public_pulse', pulse, 30); // 30s cache
        return res.json({ success: true, pulse });
    } catch (err) {
        console.error('PULSE_ERR:', err);
        return res.status(500).json({ error: 'PULSE_UNAVAILABLE' });
    }
});

// --- DIAGNOSTIC LAB ENDPOINTS ---

router.post('/diagnostics/submit', async (req, res) => {
    try {
        const data = diagnosticSchema.parse(req.body);
        const diagnosticId = `LAB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        await db.run(`
            INSERT INTO diagnostic_results (diagnostic_id, avg_reaction_ms, precision_score, raw_data)
            VALUES (?, ?, ?, ?)
        `, [diagnosticId, data.avg_reaction_ms, data.precision_score, JSON.stringify(data.raw_data || {})]);

        return res.json({ success: true, diagnostic_id: diagnosticId });
    } catch (err) {
        console.error('DIAGNOSTIC_SUBMIT_ERR:', err);
        return res.status(400).json({ error: 'INVALID_DIAGNOSTIC_DATA' });
    }
});

router.get('/diagnostics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.get('SELECT diagnostic_id, avg_reaction_ms, precision_score, created_at FROM diagnostic_results WHERE diagnostic_id = ?', [id]);
        if (!result) return res.status(404).json({ error: 'DIAGNOSTIC_NOT_FOUND' });
        
        return res.json({ success: true, diagnostic: result });
    } catch (err) {
        return res.status(500).json({ error: 'DIAGNOSTIC_LOOKUP_FAILED' });
    }
});

router.post('/action', async (req, res) => {
    try {
        const { action } = z.object({ action: z.string(), code: z.string().optional() }).parse(req.body);
        return res.json({ ok: 1, action });
    } catch (_err) {
        return res.status(400).json({ error: 'invalid_event' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { input, user_ign, user_region, axp_lab_id, session_id } = z.object({
            input: z.string().min(3),
            user_ign: z.string().optional(),
            user_region: z.string().optional(),
            axp_lab_id: z.string().optional(),
            session_id: z.string().optional()
        }).parse(req.body);

        const lookupKey = getLookupKey(input);
        const cacheKey = `V_CACHE_${session_id || 'GUEST'}_${lookupKey}`;

        // 🛡️ LOGIC HARDENING: Result Persistence (Refresh protection)
        if (session_id) {
            const cached = await db.getCache(cacheKey);
            if (cached) {
                return res.json({ ...cached, _from_cache: true });
            }
        }

        const adminSecret = await getAdminSecret();
        if (adminSecret && input === adminSecret) {
            const token = jwt.sign({ role: 'admin' }, adminSecret, { expiresIn: '1d' });
            res.cookie('xp_admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                path: '/',
                maxAge: 24 * 60 * 60 * 1000
            });
            return res.json({ type: 'admin', redirect: '/admin.html', message: 'MASTER ACCESS GRANTED' });
        }

        let blocked = false;
        await new Promise((resolve) => {
            checkSoftBan(req, res, () => {
                blocked = res.headersSent;
                resolve();
            });
        });
        if (blocked || res.headersSent) return undefined;

        const vendor = await db.get('SELECT * FROM vendors WHERE lookup_key = ?', [lookupKey]);
        if (vendor && await bcrypt.compare(input, vendor.access_key)) {
            const now = new Date();
            const activeWindow = !vendor.active_until || new Date(vendor.active_until) > now;
            if (vendor.status !== 'active' || !activeWindow) {
                return fail(res, 'XP_AUTH_SUSPENDED', 'PROVIDER_ACCESS_DENIED', 403);
            }
            const token = jwt.sign({ vendor_id: vendor.vendor_id }, await getJwtSecret(), { expiresIn: '7d' });
            res.cookie('xp_vendor_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.json({
                type: 'vendor',
                redirect: '/vendor_dashboard.html',
                vendor: { id: vendor.vendor_id, config: normalizeBranding(vendor.brand_config) },
                message: 'VENDOR DASHBOARD UNLOCKED'
            });
        }

        const found = await getCodeRecordByRawCode(input);
        if (!found) {
            await db.run('INSERT INTO security_logs (ip_address, event_type, details) VALUES (?, ?, ?)', [
                getClientIp(req),
                'VERIFY_FAIL',
                JSON.stringify({ input_length: input.length })
            ]);
            return res.status(404).json({ error: 'INVALID ACCESS KEY' });
        }

        const { keyData } = found;
        if (keyData.vendor_status === 'suspended') {
            return res.status(403).json({ error: 'PROVIDER UNAVAILABLE - ACCESS DENIED' });
        }
        if (keyData.active_until && new Date(keyData.active_until) < new Date()) {
            return res.status(403).json({ error: 'PROVIDER ACCESS WINDOW EXPIRED' });
        }
        if (keyData.status === 'expired' || (keyData.expires_at && new Date(keyData.expires_at) < new Date())) {
            return res.status(403).json({ error: 'KEY EXPIRED OR DEACTIVATED' });
        }
        if (keyData.usage_limit && keyData.current_usage >= keyData.usage_limit) {
            return res.status(403).json({ error: 'USAGE LIMIT REACHED' });
        }

        await db.run('UPDATE sensitivity_keys SET current_usage = current_usage + 1 WHERE id = ?', [keyData.id]);
        await db.run(
            'INSERT INTO code_activity (entry_code, lookup_key, user_ign, user_region) VALUES (?, ?, ?, ?)',
            [input, lookupKey, user_ign || 'Anonymous', user_region || 'Unknown']
        );
        await trackEvent('landing_view', keyData.org_id || 'XP-CORE-ORG', keyData.vendor_id, getClientIp(req), 'mobile');

        const globalOffset = await getGlobalOffset();
        
        // 🧪 NEURAL LAB SYNC (Expert Intelligence)
        let diagnosticData = null;
        const labId = axp_lab_id || null;
        if (labId) {
            diagnosticData = await db.get('SELECT avg_reaction_ms, precision_score FROM diagnostic_results WHERE diagnostic_id = ?', [labId]);
        }

        const results = Calculator.compute({
            ...keyData.results_json,
            diagnosticData
        }, globalOffset);

        const responsePayload = await buildVerificationPayload({ ...keyData, results_json: results, current_usage: (keyData.current_usage || 0) + 1 }, input);
        
        if (session_id && typeof db.setCache === 'function') {
            await db.setCache(cacheKey, responsePayload, 300);
        }

        await dispatchVendorWebhook(keyData.vendor_id, 'code_used', {
            code: input,
            user_ign: user_ign || 'Anonymous',
            region: user_region || 'Unknown',
            used_at: new Date().toISOString()
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('live_event', {
                type: 'verify',
                vendor_id: keyData.vendor_id,
                user_ign: user_ign || 'Anonymous',
                region: user_region || 'Unknown',
                device: `${responsePayload.sensitivity.brand || ''} ${responsePayload.sensitivity.model || ''}`.trim(),
                timestamp: new Date().toISOString()
            });
        }

        return res.json(responsePayload);
    } catch (err) {
        console.error('Vault Verification Error:', err);
        const msg = err?.message || 'VAULT SYSTEM ERROR';
        return res.status(500).json({ error: `VAULT SYSTEM ERROR: ${msg}` });
    }
});

router.post('/admin/login', async (req, res, next) => {
    try {
        const adminSecret = await getAdminSecret();
        if (!adminSecret) return res.status(503).json({ error: 'ADMIN_SECRET_NOT_CONFIGURED' });
        const { password } = z.object({ password: z.string().min(4) }).parse(req.body || {});
        const isMatch = password === adminSecret || await bcrypt.compare(password, adminSecret);
        if (!isMatch) return res.status(401).json({ error: 'Unauthorized' });
        const token = jwt.sign({ role: 'admin' }, adminSecret, { expiresIn: '1d' });
        res.cookie('xp_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.json({ token, type: 'admin', redirect: '/admin.html' });
    } catch (err) {
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_LOGIN_INPUT', 400, err.errors);
        return next(err);
    }
});

router.post('/admin/logout', (_req, res) => {
    res.clearCookie('xp_admin_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', path: '/' });
    return res.json({ success: true });
});

router.post('/vendor/login', async (req, res) => {
    try {
        const { access_key } = z.object({ access_key: z.string().min(6) }).parse(req.body || {});
        const vendor = await db.get('SELECT vendor_id, access_key, status, active_until FROM vendors WHERE lookup_key = ?', [getLookupKey(access_key)]);
        if (!vendor || !(await bcrypt.compare(access_key, vendor.access_key))) {
            return fail(res, 'XP_AUTH_DENIED', 'INVALID_VENDOR_KEY', 401);
        }
        if (vendor.status !== 'active' || (vendor.active_until && new Date(vendor.active_until) <= new Date())) {
            return fail(res, 'XP_AUTH_SUSPENDED', 'VENDOR_ACCOUNT_LOCKED', 403);
        }

        const token = jwt.sign({ vendor_id: vendor.vendor_id }, await getJwtSecret(), { expiresIn: '7d' });
        res.cookie('xp_vendor_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.json({ token, type: 'vendor', redirect: '/vendor_dashboard.html' });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        console.error('[VENDOR_LOGIN_CRITICAL_ERR]:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/vendor/logout', authenticateVendor, async (_req, res) => {
    res.clearCookie('xp_vendor_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', path: '/' });
    return res.json({ success: true });
});

router.get('/profile', authenticateVendor, async (req, res) => {
    try {
        const vendor = await db.get(`
            SELECT vendor_id, status, active_until, brand_config, webhook_url, usage_limit, is_verified
            FROM vendors WHERE vendor_id = ?
        `, [req.vendorId]);
        if (!vendor) return res.status(404).json({ error: 'VENDOR_NOT_FOUND' });

        const stats = await db.get(`
            SELECT COUNT(*) as codes, COALESCE(SUM(current_usage), 0) as hits
            FROM sensitivity_keys WHERE vendor_id = ?
        `, [req.vendorId]);
        const likes = await db.get(`
            SELECT COUNT(*) as likes
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ? AND ca.feedback_rating IS NOT NULL
        `, [req.vendorId]);

        const config = normalizeBranding(vendor.brand_config);
        const now = new Date();
        const secondsLeft = vendor.active_until ? Math.max(0, Math.floor((new Date(vendor.active_until) - now) / 1000)) : null;

        return res.json({
            vendor_id: vendor.vendor_id,
            display_name: config.display_name || vendor.vendor_id,
            total_codes: stats?.codes || 0,
            total_hits: stats?.hits || 0,
            total_likes: likes?.likes || 0,
            status: vendor.status,
            active_until: vendor.active_until,
            seconds_left: secondsLeft,
            is_verified: !!vendor.is_verified,
            webhook_url: vendor.webhook_url || '',
            usage_limit: vendor.usage_limit ?? null,
            logo_url: config.logo_url || '',
            youtube: config.youtube || '',
            tiktok: config.tiktok || '',
            discord: config.discord || '',
            social_link: config.social_link || '',
            brand_config: config
        });
    } catch (err) {
        console.error('VENDOR_PROFILE_ERR:', err);
        return res.status(500).json({ error: 'VENDOR_PROFILE_UNAVAILABLE' });
    }
});

router.put('/profile', authenticateVendor, async (req, res) => {
    try {
        return res.json(await updateVendorProfile(req.vendorId, req.body));
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: err.errors });
        console.error('PUT /profile error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/profile', authenticateVendor, async (req, res) => {
    try {
        return res.json(await updateVendorProfile(req.vendorId, req.body));
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: err.errors });
        return res.status(500).json({ error: 'Server error' });
    }
});





router.get('/user/profile', async (req, res) => {
    try {
        const fingerprint = getUserFingerprint(req);
        const profile = await db.get('SELECT * FROM user_profiles WHERE user_id = ?', [fingerprint]);
        return res.json(profile || { level: 1, xp_points: 0 });
    } catch (err) {
        console.error('FETCH_PROFILE_ERR:', err);
        return res.status(500).json({ error: 'FETCH_PROFILE_FAILED' });
    }
});

router.get('/admin/meta-analysis', authenticateAdmin, async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                AVG(feedback_rating) as avg_rating,
                COUNT(*) as total_feedback
            FROM code_activity 
            WHERE feedback_rating IS NOT NULL 
            AND used_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        const avg = stats?.avg_rating || 5.0;
        let suggestion = "STABLE";
        let offset = 1.0;

        if (avg < 3.5) {
            suggestion = "META_DRIFT_DETECTED: HIGH_FRICTION";
            offset = 1.05;
        } else if (avg < 4.2) {
            suggestion = "SUBTLE_DRIFT: CALIBRATION_RECOMMENDED";
            offset = 1.02;
        } else if (avg > 4.8 && stats?.total_feedback > 10) {
            suggestion = "OPTIMAL_COHERENCE";
            offset = 1.0;
        }

        return res.json({
            avg_rating: avg.toFixed(2),
            total_feedback: stats?.total_feedback || 0,
            suggestion,
            recommended_offset: offset,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ error: 'ANALYSIS_FAILED' });
    }
});





// --- ELITE USER INTERACTION ROUTES ---

function getUserFingerprint(req) {
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || 'unknown';
    const accept = req.headers['accept-language'] || 'en';
    return crypto.createHash('sha256').update(`${ip}|${ua}|${accept}`).digest('hex');
}



// --- ELITE INTERACTION ROUTES ---

router.post('/arena/hype', async (req, res) => {
    try {
        const { vendor_id, type } = z.object({
            vendor_id: z.string().min(1),
            type: z.enum(['fire', 'heart', 'clap', 'trophy'])
        }).parse(req.body);

        await db.run('INSERT INTO arena_hype (vendor_id, hype_type) VALUES (?, ?)', [vendor_id, type]);
        
        const io = req.app.get('io');
        if (io) {
            io.emit('arena_hype', { vendor_id, type, timestamp: new Date().toISOString() });
        }

        return res.json({ success: true });
    } catch (err) {
        return res.status(400).json({ error: 'INVALID_HYPE_DATA' });
    }
});

router.post('/arena/track', async (req, res) => {
    try {
        const { vendor_id, type, details } = z.object({
            vendor_id: z.string().min(1),
            type: z.string().min(1),
            details: z.record(z.any()).optional()
        }).parse(req.body);

        await trackEvent(type, 'XP-CORE-ORG', vendor_id, getClientIp(req), JSON.stringify(details || {}));
        return res.json({ success: true });
    } catch (err) {
        return res.status(400).json({ error: 'TRACKING_FAILED' });
    }
});



router.get('/analytics/connected', authenticateVendor, async (req, res) => {
    try {
        const vendorId = req.vendorId;

        // 1. Core Profile Stats
        const profileStats = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = ?) as total_codes,
                (SELECT COALESCE(SUM(current_usage), 0) FROM sensitivity_keys WHERE vendor_id = ?) as total_hits
        `, [vendorId, vendorId]);

        const funnel = {
            codes: profileStats.total_codes || 0,
            views: profileStats.total_hits || 0,
            entries: 0 // Feature deprecated
        };

        // 2. Top codes by engagement
        const topCodes = await db.all(`
            SELECT lookup_key as access_code, current_usage as engagement_count
            FROM sensitivity_keys
            WHERE vendor_id = ?
            ORDER BY engagement_count DESC
            LIMIT 10
        `, [vendorId]);

        // 3. Heatmap (Regions)
        const heatmap = await db.all(`
            SELECT user_region, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY user_region
        `, [vendorId]);

        return res.json({ funnel, top_codes: topCodes, heatmap });
    } catch (err) {
        console.error('CONNECTED_ANALYTICS_ERR:', err);
        return res.status(500).json({ error: 'ANALYTICS_UNAVAILABLE' });
    }
});





router.get('/codes', authenticateVendor, async (req, res) => {
    try {
        const codes = await db.all(`
            SELECT k.lookup_key, k.current_usage, k.usage_limit, k.status, k.expires_at, k.created_at, k.results_json,
                   (SELECT COUNT(*) FROM code_activity WHERE lookup_key = k.lookup_key) as real_usage
            FROM sensitivity_keys k
            WHERE k.vendor_id = ?
            ORDER BY k.created_at DESC
        `, [req.vendorId]);
        return res.json(codes.map((row) => ({ ...row, results_json: jsonOrObject(row.results_json, {}) })));
    } catch (err) {
        console.error('GET /codes error:', err);
        return res.status(500).json({ error: 'DATABASE_QUERY_FAILED', debug: err.message });
    }
});

router.delete('/codes/:lookupKey', authenticateVendor, async (req, res) => {
    try {
        const key = await db.get('SELECT id FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        if (!key) return res.status(404).json({ error: 'KEY_NOT_FOUND' });
        await db.run('DELETE FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'REVOKE_FAILED' });
    }
});

router.put('/codes/:lookupKey/extend', authenticateVendor, async (req, res) => {
    try {
        const { hours } = z.object({ hours: z.number().int().positive() }).parse(req.body || {});
        const owner = await db.get('SELECT id FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        if (!owner) return res.status(404).json({ error: 'Not found' });
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        await db.run('UPDATE sensitivity_keys SET expires_at = ? WHERE lookup_key = ? AND vendor_id = ?', [expiresAt, req.params.lookupKey, req.vendorId]);
        return res.json({ success: true, expires_at: expiresAt.toISOString() });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid hours' });
        return res.status(500).json({ error: 'Server error' });
    }
});

router.put('/codes/:lookupKey/limit', authenticateVendor, async (req, res) => {
    try {
        const { limit } = z.object({ limit: z.number().int().min(0).nullable() }).parse(req.body || {});
        const owner = await db.get('SELECT id FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        if (!owner) return res.status(404).json({ error: 'Not found' });
        await db.run('UPDATE sensitivity_keys SET usage_limit = ? WHERE lookup_key = ? AND vendor_id = ?', [limit, req.params.lookupKey, req.vendorId]);
        return res.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid limit' });
        return res.status(500).json({ error: 'Server error' });
    }
});

router.put('/codes/:lookupKey/deactivate', authenticateVendor, async (req, res) => {
    try {
        const owner = await db.get('SELECT id FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        if (!owner) return res.status(404).json({ error: 'Not found' });
        await db.run('UPDATE sensitivity_keys SET status = ? WHERE lookup_key = ? AND vendor_id = ?', ['expired', req.params.lookupKey, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/keys', authenticateVendor, async (req, res) => {
    try {
        const keys = await db.all(`
            SELECT lookup_key, current_usage, usage_limit, status, expires_at, created_at, results_json
            FROM sensitivity_keys
            WHERE vendor_id = ?
            ORDER BY created_at DESC
        `, [req.vendorId]);
        return res.json(keys.map((row) => ({ ...row, results_json: jsonOrObject(row.results_json, {}) })));
    } catch (_err) {
        return res.status(500).json({ error: 'FAILED_TO_FETCH_KEYS' });
    }
});

router.delete('/keys/:lookupKey', authenticateVendor, async (req, res) => {
    try {
        await db.run('DELETE FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'REVOKE_FAILED' });
    }
});

router.get('/presets', authenticateVendor, async (req, res) => {
    try {
        const presets = await db.all('SELECT id, preset_name, config_json, created_at FROM vendor_presets WHERE vendor_id = ? ORDER BY created_at DESC', [req.vendorId]);
        return res.json(presets.map((preset) => ({ ...preset, config_json: jsonOrObject(preset.config_json, {}) })));
    } catch (_err) {
        return res.status(500).json({ error: 'FETCH_PRESETS_FAILED' });
    }
});

router.post('/presets', authenticateVendor, async (req, res) => {
    try {
        const { name, config } = z.object({ name: z.string().min(1).max(100), config: z.record(z.any()) }).parse(req.body || {});
        await db.run('INSERT INTO vendor_presets (vendor_id, preset_name, config_json) VALUES (?, ?, ?)', [req.vendorId, name, JSON.stringify(config)]);
        return res.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'SAVE_PRESET_FAILED', details: err.errors });
        return res.status(500).json({ error: 'SAVE_PRESET_FAILED' });
    }
});

router.delete('/presets/:id', authenticateVendor, async (req, res) => {
    try {
        await db.run('DELETE FROM vendor_presets WHERE id = ? AND vendor_id = ?', [req.params.id, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'DELETE_PRESET_FAILED' });
    }
});

router.get('/stats/regions', authenticateVendor, async (req, res) => {
    try {
        const regions = await db.all(`
            SELECT user_region as region, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY user_region
            ORDER BY count DESC
        `, [req.vendorId]);
        return res.json(regions);
    } catch (_err) {
        return res.status(500).json({ error: 'REGION_STATS_FAILED' });
    }
});

router.get('/analytics/regions', authenticateVendor, async (req, res) => {
    try {
        const stats = await db.all(`
            SELECT user_region as region, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY user_region
            ORDER BY count DESC
        `, [req.vendorId]);
        return res.json(stats);
    } catch (_err) {
        return res.status(500).json({ error: 'ANALYTICS_FAILED' });
    }
});

router.get('/stats', authenticateVendor, async (req, res) => {
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
        return res.json(stats);
    } catch (_err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/activity', authenticateVendor, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT ca.used_at, ca.user_ign, ca.user_region, ca.feedback_rating, ca.feedback_tag, ca.feedback_comment, sk.lookup_key
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
            LIMIT 50
        `, [req.vendorId]);
        return res.json(rows);
    } catch (_err) {
        return res.status(500).json({ error: 'ACTIVITY_UNAVAILABLE' });
    }
});

router.get('/export', authenticateVendor, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT ca.used_at, ca.user_ign, ca.user_region, ca.entry_code, ca.feedback_rating, ca.feedback_tag, ca.feedback_comment, sk.lookup_key
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
        `, [req.vendorId]);
        let csv = 'TIMESTAMP,IGN,REGION,ENTRY_CODE,LOOKUP_KEY,RATING,FEEDBACK_TAG,FEEDBACK_COMMENT\n';
        logs.forEach((row) => {
            csv += `${row.used_at},"${row.user_ign || ''}","${row.user_region || ''}","${row.entry_code || ''}",${row.lookup_key || ''},${row.feedback_rating || ''},"${row.feedback_tag || ''}","${String(row.feedback_comment || '').replaceAll('"', '""')}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=xp_activity_${req.vendorId}.csv`);
        return res.status(200).send(csv);
    } catch (_err) {
        return res.status(500).json({ error: 'EXPORT_FAILED' });
    }
});

router.get('/insights', authenticateVendor, async (req, res) => {
    try {
        const overview = await db.get(`
            SELECT
                COUNT(DISTINCT sk.lookup_key) as total_profiles,
                COUNT(ca.id) as total_views,
                COALESCE(SUM(CASE WHEN ca.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0) as total_feedback,
                ROUND(AVG(ca.feedback_rating), 2) as average_rating
            FROM sensitivity_keys sk
            LEFT JOIN code_activity ca ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
        `, [req.vendorId]);
        const topProfiles = await db.all(`
            SELECT
                sk.lookup_key,
                sk.created_at,
                COALESCE(COUNT(ca.id), 0) as total_views,
                COALESCE(SUM(CASE WHEN ca.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0) as feedback_count,
                ROUND(AVG(ca.feedback_rating), 2) as average_rating
            FROM sensitivity_keys sk
            LEFT JOIN code_activity ca ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY sk.lookup_key, sk.created_at
            ORDER BY feedback_count DESC, total_views DESC, sk.created_at DESC
            LIMIT 5
        `, [req.vendorId]);
        const topRegions = await db.all(`
            SELECT ca.user_region as region, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY ca.user_region
            ORDER BY count DESC
            LIMIT 5
        `, [req.vendorId]);
        const feedbackBreakdown = await db.all(`
            SELECT COALESCE(ca.feedback_tag, 'unclassified') as tag, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ? AND ca.feedback_rating IS NOT NULL
            GROUP BY COALESCE(ca.feedback_tag, 'unclassified')
            ORDER BY count DESC
        `, [req.vendorId]);

        const totalViews = Number(overview?.total_views || 0);
        const totalFeedback = Number(overview?.total_feedback || 0);
        return res.json({
            total_profiles: Number(overview?.total_profiles || 0),
            total_views: totalViews,
            total_feedback: totalFeedback,
            average_rating: Number(overview?.average_rating || 0),
            feedback_conversion_pct: totalViews > 0 ? Math.round((totalFeedback / totalViews) * 1000) / 10 : 0,
            top_profiles: topProfiles,
            top_regions: topRegions,
            feedback_breakdown: feedbackBreakdown
        });
    } catch (err) {
        console.error('INSIGHTS_ERR:', err);
        return res.status(500).json({ error: 'INSIGHTS_UNAVAILABLE' });
    }
});

router.post('/generate', authenticateVendor, async (req, res) => {
    try {
        const { brand, series, model, ram, speed, claw, neuralScale } = z.object({
            brand: z.string().min(1),
            series: z.string().optional().nullable(),
            model: z.string().min(1),
            ram: z.coerce.number().int().min(1).max(32),
            speed: z.string().min(1),
            claw: z.string().min(1),
            neuralScale: z.coerce.number().min(1).max(10).optional()
        }).parse(req.body || {});

        const results = Calculator.compute({
            brand,
            series: series || '',
            model,
            ram,
            speed,
            claw,
            neuralScale: neuralScale || 5
        }, await getGlobalOffset());

        const created = await createVendorCode(req.vendorId, results, null);
        await trackEvent('code_generated', 'XP-CORE-ORG', req.vendorId, getClientIp(req), `${brand} ${model}`.trim());
        return res.json({ accessKey: created.accessKey, lookupKey: created.lookupKey, results });
    } catch (err) {
        console.error('GEN_ERR:', err);
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_GENERATION_INPUT', 400, err.errors);
        return res.status(500).json({ error: err.message || 'VAULT_GENERATION_FAILED' });
    }
});

router.post('/admin/generate', authenticateAdmin, async (req, res) => {
    try {
        const { brand, series, model, ram, speed, claw, neuralScale } = z.object({
            brand: z.string().min(1),
            series: z.string().optional().nullable(),
            model: z.string().min(1),
            ram: z.coerce.number().int().min(1).max(32),
            speed: z.string().min(1),
            claw: z.string().min(1),
            neuralScale: z.coerce.number().min(1).max(10).optional()
        }).parse(req.body || {});

        const results = Calculator.compute({
            brand,
            series: series || '',
            model,
            ram,
            speed,
            claw,
            neuralScale: neuralScale || 5
        }, await getGlobalOffset());

        const adminVendorId = await ensureSystemVendor('XP-ADMIN', 'XP_ADMIN_MASTER');
        const created = await createVendorCode(adminVendorId, results, 'AUTO_GENERATED_BY_ADMIN');
        await trackEvent('code_generated', 'XP-CORE-ORG', adminVendorId, getClientIp(req), `${brand} ${model}`.trim());
        return res.json({ accessKey: created.accessKey, lookupKey: created.lookupKey, results, actor: 'admin' });
    } catch (err) {
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_GENERATION_INPUT', 400, err.errors);
        return res.status(500).json({ error: err.message || 'ADMIN_GENERATION_FAILED' });
    }
});

router.post('/manual-entry', authenticateVendor, async (req, res) => {
    try {
        const data = z.object({
            general: z.coerce.number().min(0).max(200),
            redDot: z.coerce.number().min(0).max(200),
            scope2x: z.coerce.number().min(0).max(200),
            scope4x: z.coerce.number().min(0).max(200),
            sniper: z.coerce.number().min(0).max(200),
            freeLook: z.coerce.number().min(0).max(200),
            ads: z.coerce.number().min(0).max(200).optional(),
            dpi: z.union([z.string(), z.number()]).optional(),
            fireButton: z.union([z.string(), z.number()]).optional(),
            advice: z.string().max(500).optional()
        }).parse(req.body || {});

        const results = {
            formula_version: Calculator.version,
            brand: 'MANUAL',
            model: 'PRESET',
            general: data.general,
            redDot: data.redDot,
            scope2x: data.scope2x,
            scope4x: data.scope4x,
            sniperScope: data.sniper,
            freeLook: data.freeLook,
            ads: data.ads ?? data.general,
            dpi: data.dpi || '600-640',
            fireButton: data.fireButton || '50-54',
            isManual: true
        };

        const created = await createVendorCode(req.vendorId, results, data.advice || null);
        await trackEvent('code_generated', 'XP-CORE-ORG', req.vendorId, getClientIp(req), 'MANUAL_PRESET');
        return res.json({ accessKey: created.accessKey, lookupKey: created.lookupKey, results });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'MANUAL_PUBLISH_FAILED', details: err.errors });
        return res.status(500).json({ error: err.message || 'MANUAL_PUBLISH_FAILED' });
    }
});

router.post('/vendor/extend-access', authenticateVendor, async (req, res) => {
    return res.status(403).json({ error: 'ACCESS_EXTENSION_ADMIN_ONLY' });
});

router.post('/webhook', authenticateVendor, async (req, res) => {
    try {
        const { url } = z.object({ url: z.string().url().nullable() }).parse(req.body || {});
        await db.run('UPDATE vendors SET webhook_url = ? WHERE vendor_id = ?', [url, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'WEBHOOK_UPDATE_FAILED' });
    }
});

router.get('/org/stats', authenticateAdmin, async (_req, res) => {
    try {
        const events = await db.all(`SELECT action as event_type, COUNT(*) as count FROM audit_logs WHERE action IN ('TRACK_CODE_GENERATED','TRACK_VERIFY_SUCCESS','TRACK_RESULT_VIEW') GROUP BY action`).catch(() => []);
        const counts = { landing_view: 0, calibration_start: 0, code_generated: 0, result_view: 0 };
        events.forEach((event) => {
            if (event.event_type === 'TRACK_CODE_GENERATED') counts.code_generated = event.count;
            if (event.event_type === 'TRACK_VERIFY_SUCCESS') counts.calibration_start = event.count;
            if (event.event_type === 'TRACK_RESULT_VIEW') counts.result_view = event.count;
        });
        const vendors = await db.get('SELECT COUNT(*) as count FROM vendors');
        const codes = await db.get('SELECT COUNT(*) as count FROM sensitivity_keys');
        return res.json({
            vendors: vendors.count,
            codes: codes.count,
            funnel: [
                { label: 'LANDING VIEWS', val: counts.landing_view },
                { label: 'CALIBRATIONS', val: counts.calibration_start },
                { label: 'CODE_PROVISIONED', val: counts.code_generated },
                { label: 'RESULT_HITS', val: counts.result_view }
            ]
        });
    } catch (err) {
        console.error('ORG_STATS_ERR:', err);
        return res.status(500).json({ error: 'ORG_STATS_UNAVAILABLE' });
    }
});

router.get('/org/creators', authenticateAdmin, async (_req, res) => {
    try {
        const creators = await db.all(`
            SELECT v.vendor_id as name,
                   (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = v.vendor_id) as total_keys,
                   (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key WHERE sk.vendor_id = v.vendor_id) as clicks
            FROM vendors v
            LIMIT 10
        `);
        return res.json(creators);
    } catch (err) {
        console.error('CREATOR_DATA_ERR:', err);
        return res.status(500).json({ error: 'CREATOR_DATA_ERR', details: err.message });
    }
});

router.get('/admin/stats', authenticateAdmin, async (_req, res) => {
    try {
        const stats = await db.get(`
            SELECT
                (SELECT COUNT(*) FROM vendors) as vendors,
                (SELECT COUNT(*) FROM sensitivity_keys) as codes,
                (SELECT COUNT(*) FROM code_activity) as usage_total,
                (SELECT AVG(feedback_rating) FROM code_activity WHERE feedback_rating IS NOT NULL) as global_accuracy
        `);
        return res.json(stats);
    } catch (err) {
        console.error('GET /admin/stats error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/lookup/:lookupKey', authenticateAdmin, async (req, res) => {
    try {
        const key = await db.get(`
            SELECT k.*, v.vendor_id, v.status as vendor_status
            FROM sensitivity_keys k
            LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
            WHERE k.lookup_key = ?
        `, [req.params.lookupKey]);
        if (!key) return res.status(404).json({ error: 'KEY_NOT_FOUND' });
        const activity = await db.all('SELECT * FROM code_activity WHERE lookup_key = ? ORDER BY used_at DESC LIMIT 10', [req.params.lookupKey]);
        return res.json({ key, activity });
    } catch (_err) {
        return res.status(500).json({ error: 'LOOKUP_FAILED' });
    }
});

router.post('/admin/revoke-global', authenticateAdmin, async (req, res) => {
    try {
        const { lookupKey } = z.object({ lookupKey: z.string().min(1) }).parse(req.body || {});
        await db.run('DELETE FROM sensitivity_keys WHERE lookup_key = ?', [lookupKey]);
        await logAudit('admin', 'SYSTEM', 'GLOBAL_REVOKE', { lookupKey }, getClientIp(req));
        return res.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' });
        return res.status(500).json({ error: 'REVOKE_GLOBAL_FAILED' });
    }
});

router.get('/admin/vendors', authenticateAdmin, async (_req, res) => {
    try {
        const accounts = await db.all(`
            SELECT a.vendor_id, a.display_name, a.status, a.tier, a.created_at,
                   GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), a.active_until)) as seconds_left,
                   (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = a.vendor_id) as total_codes,
                   (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key WHERE sk.vendor_id = a.vendor_id) as total_usage
            FROM vendors a
            ORDER BY a.created_at DESC
        `);
        return res.json(accounts.map((account) => ({ ...account, brand_config: jsonOrObject(account.brand_config, {}) })));
    } catch (err) {
        console.error('GET /admin/vendors error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/vendor/:vendorId/analytics', authenticateAdmin, async (req, res) => {
    try {
        const activities = await db.all(`
            SELECT ca.*, sk.results_json
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
            LIMIT 50
        `, [req.params.vendorId]);
        return res.json(activities.map((activity) => ({ ...activity, results_json: jsonOrObject(activity.results_json, {}) })));
    } catch (err) {
        console.error('GET /vendor/analytics error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/vendors', authenticateAdmin, async (req, res) => {
    try {
        const nullableInt = (minimum) => z.preprocess((value) => {
            if (value === '' || value === null || value === undefined) return undefined;
            return value;
        }, z.coerce.number().int().min(minimum).optional());

        const { vendorId: requestedId, orgId: rawOrgId, orgName: rawOrgName, usageLimit, durationDays, brandConfig, tier } = z.object({
            vendorId: z.string().min(2).optional(),
            orgId: z.string().optional(),
            orgName: z.string().optional(),
            usageLimit: nullableInt(0),
            durationDays: nullableInt(1),
            brandConfig: z.record(z.any()).nullable().optional(),
            tier: z.enum(['normal', 'gold', 'premium']).optional().default('normal')
        }).parse(req.body || {});

        const orgId = ((rawOrgId || 'XP-CORE-ORG').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')) || 'XP-CORE-ORG';
        const normalizedRequestedId = requestedId
            ? requestedId.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
            : '';
        const vendorId = normalizedRequestedId || `VNDR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const existing = await db.get('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (existing) return res.status(409).json({ error: 'VENDOR_ALREADY_EXISTS' });

        await ensureKeyStorageCapacity();

        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const accessKey = `AXP-${vendorId}-${randomDigits}`;
        const hashedAccessKey = await bcrypt.hash(accessKey, 10);
        const lookupKey = getLookupKey(accessKey);

        let activeUntil = null;
        if (durationDays) {
            const date = new Date();
            date.setDate(date.getDate() + durationDays);
            activeUntil = date.toISOString().slice(0, 19).replace('T', ' ');
        }

        const orgName = rawOrgName || rawOrgId || 'AXP GLOBAL';
        await db.run("INSERT IGNORE INTO organizations (org_id, org_name, plan_tier) VALUES (?, ?, 'enterprise')", [orgId, orgName]);
        await db.run(`
            INSERT INTO vendors (org_id, vendor_id, tier, access_key, lookup_key, active_until, brand_config, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `, [orgId, vendorId, tier, hashedAccessKey, lookupKey, activeUntil, JSON.stringify(brandConfig || {})]);
        await logAudit('admin', 'SYSTEM', 'VENDOR_REGISTER', { vendorId, accessKey, tier }, getClientIp(req));
        return res.json({ success: true, message: 'VENDOR REGISTERED SUCCESSFULLY', vendorId, accessKey, tier });
    } catch (err) {
        console.error('VENDOR_REGISTRATION_CRITICAL_FAILURE:', err);
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT_DATA', details: err.errors });
        if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'VENDOR_ALREADY_EXISTS' });
        return res.status(500).json({ error: `SYSTEM_LOGIC_ERROR: ${err.message}` });
    }
});

router.post('/admin/vendor/status', authenticateAdmin, async (req, res, next) => {
    try {
        const { vendorId, status } = z.object({ vendorId: z.string().min(2), status: z.enum(['active', 'suspended']) }).parse(req.body || {});
        await db.run('UPDATE vendors SET status = ? WHERE vendor_id = ?', [status, vendorId]);
        await logAudit('admin', 'SYSTEM', 'VENDOR_STATUS_CHANGE', { vendorId, status }, getClientIp(req));
        return res.json({ success: true, message: `VENDOR ${status.toUpperCase()} SUCCESSFULLY` });
    } catch (err) {
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_STATUS_PARAMS', 400, err.errors);
        return next(err);
    }
});

router.post('/admin/vendor/activate_until', authenticateAdmin, async (req, res) => {
    try {
        const { vendorId, hours, until } = z.object({
            vendorId: z.string().min(2),
            hours: z.number().int().positive().max(24 * 365).optional(),
            until: z.string().datetime().optional()
        }).refine((data) => data.hours || data.until, 'Provide hours or until').parse(req.body || {});

        let activeUntil = null;
        if (until) activeUntil = new Date(until);
        if (hours) activeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
        await db.run('UPDATE vendors SET status = ?, active_until = ? WHERE vendor_id = ?', ['active', activeUntil, vendorId]);
        await logAudit('admin', 'SYSTEM', 'VENDOR_ACTIVATE_TIMED', { vendorId, active_until: activeUntil }, getClientIp(req));
        return res.json({ success: true, active_until: activeUntil?.toISOString() || null });
    } catch (err) {
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_ACTIVATE_PARAMS', 400, err.errors);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/vendor/:vendorId', authenticateAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;
        // 1. Clear linked activity & share tokens first (to avoid orphan records)
        await db.run('DELETE FROM share_tokens WHERE lookup_key IN (SELECT lookup_key FROM sensitivity_keys WHERE vendor_id = ?)', [vendorId]);
        await db.run('DELETE FROM code_activity WHERE lookup_key IN (SELECT lookup_key FROM sensitivity_keys WHERE vendor_id = ?)', [vendorId]);
        
        // 2. Clear primary linked tables
        await db.run('DELETE FROM sensitivity_keys WHERE vendor_id = ?', [vendorId]);
        await db.run('DELETE FROM vendor_presets WHERE vendor_id = ?', [vendorId]);
        
        // 3. Delete the vendor record
        await db.run('DELETE FROM vendors WHERE vendor_id = ?', [vendorId]);
        
        await logAudit('admin', 'SYSTEM', 'VENDOR_ERASE', { vendorId }, getClientIp(req));
        return res.json({ success: true, message: `VENDOR ${vendorId} ERASED SUCCESSFULLY` });
    } catch (err) {
        console.error('DELETE /admin/vendor error:', err);
        return res.status(500).json({ error: 'ERASE_FAILED', details: err.message });
    }
});

// Alias route for delete consistent with frontend calls
router.delete('/admin/vendors/:vendorId', authenticateAdmin, async (req, res) => {
    // Forward to primary handler
    req.url = `/admin/vendor/${req.params.vendorId}`;
    return router.handle(req, res);
});

router.get('/admin/settings', authenticateAdmin, async (_req, res) => {
    try {
        const settings = await db.all('SELECT * FROM system_settings');
        return res.json(settings);
    } catch (_err) {
        return res.status(500).json({ error: 'SETTINGS_UNAVAILABLE' });
    }
});

router.get('/admin/schema/status', authenticateAdmin, async (_req, res) => {
    try {
        const tables = await db.all(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name IN ('vendor_presets', 'transient_cache', 'share_tokens', 'schema_migrations')
        `);
        const migrations = await db.all('SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 20').catch(() => []);
        const tableNames = new Set((tables || []).map((row) => row.table_name));
        return res.json({
            tables: {
                vendor_presets: tableNames.has('vendor_presets'),
                transient_cache: tableNames.has('transient_cache'),
                share_tokens: tableNames.has('share_tokens'),
                schema_migrations: tableNames.has('schema_migrations')
            },
            recent_migrations: migrations
        });
    } catch (err) {
        console.error('SCHEMA_STATUS_ERR:', err);
        return res.status(500).json({ error: 'SCHEMA_STATUS_UNAVAILABLE' });
    }
});

router.post('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const { key, value } = z.object({ key: z.string(), value: z.string() }).parse(req.body || {});
        await db.run('REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
        await logAudit('admin', 'SYSTEM', 'SETTING_CHANGE', { key, value }, getClientIp(req));
        return res.json({ success: true, message: 'SETTING_UPDATED' });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        return res.status(500).json({ error: 'SETTINGS_UPDATE_FAILED' });
    }
});

router.post('/admin/update-master-key', authenticateAdmin, async (req, res) => {
    try {
        const { newKey } = z.object({ newKey: z.string().min(4) }).parse(req.body || {});
        const hashedKey = await bcrypt.hash(newKey, 10);
        await db.run('REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)', ['admin_secret', hashedKey]);
        await logAudit('admin', 'MASTER', 'CHANGE_MASTER_KEY', { action: 'updated_secure' }, getClientIp(req));
        return res.json({ success: true, message: 'MASTER_KEY_UPDATED' });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        return res.status(500).json({ error: 'MASTER_KEY_UPDATE_FAILED' });
    }
});

router.post('/track', async (req, res) => {
    try {
        const { event_type, vendor_id, session_id, device } = req.body || {};
        const account = vendor_id ? await db.get('SELECT org_id FROM vendors WHERE vendor_id = ?', [vendor_id]) : null;
        await trackEvent(event_type, account?.org_id || 'XP-CORE-ORG', vendor_id || 'XP-PUBLIC', session_id || getClientIp(req), device || 'unknown');
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'TRACK_ERR' });
    }
});

router.get('/admin/audit-logs', authenticateAdmin, async (_req, res) => {
    try {
        return res.json(await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'));
    } catch (_err) {
        return res.status(500).json({ error: 'AUDIT_LOGS_UNAVAILABLE' });
    }
});

router.get('/admin/security-logs', authenticateAdmin, async (_req, res) => {
    try {
        const logs = await db.all('SELECT id, ip_address, event_type, details, created_at FROM security_logs ORDER BY created_at DESC LIMIT 100');
        return res.json(logs);
    } catch (err) {
        console.error('SECURITY_LOGS_ERR:', err);
        return res.status(500).json({ error: 'SECURITY_LOGS_UNAVAILABLE' });
    }
});

router.get('/admin/live-feed', authenticateAdmin, async (_req, res) => {
    try {
        const rows = await db.all(`
            SELECT ca.used_at as ts, ca.user_ign, ca.user_region, ca.feedback_rating, ca.feedback_comment, sk.vendor_id
            FROM code_activity ca
            LEFT JOIN sensitivity_keys sk ON sk.lookup_key = ca.lookup_key
            ORDER BY ca.used_at DESC
            LIMIT 30
        `);
        return res.json(rows.map((row) => ({
            type: row.feedback_rating ? 'feedback' : 'verify',
            timestamp: row.ts,
            vendor_id: row.vendor_id || 'XP-CORE',
            user_ign: row.user_ign || 'Anonymous',
            region: row.user_region || 'Unknown',
            rating: row.feedback_rating || null,
            feedback: row.feedback_comment || null
        })));
    } catch (err) {
        console.error('LIVE_FEED_ERR:', err);
        return res.status(500).json({ error: 'LIVE_FEED_UNAVAILABLE' });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const payload = z.object({
            code: z.string().min(1).optional(),
            entry_code: z.string().min(1).optional(),
            share_token: z.string().min(1).optional(),
            rating: z.number().int().min(1).max(5),
            feedback: z.string().max(500).optional(),
            feedback_text: z.string().max(500).optional(),
            feedback_tag: z.enum(FEEDBACK_ALLOWED_TAGS).optional(),
            feedback_source: z.enum(FEEDBACK_SOURCES).optional()
        }).refine((data) => data.code || data.entry_code || data.share_token, 'CODE_REQUIRED').parse(req.body || {});

        const entryCode = payload.code || payload.entry_code || null;
        const allowProvisionalCodeFeedback = Boolean(entryCode)
            && !payload.share_token
            && !payload.feedback_tag
            && /^XP-[A-Z0-9]{3,8}-\d{4,8}$/i.test(entryCode);
        let found = payload.share_token
            ? await getCodeRecordFromShareToken(payload.share_token)
            : (allowProvisionalCodeFeedback ? null : await getCodeRecordByRawCode(entryCode));
        if (!found && allowProvisionalCodeFeedback) {
            found = { keyData: null, lookupKey: getLookupKey(entryCode) };
        }
        if (!found) return fail(res, 'XP_AUTH_INVALID', 'UNKNOWN_OR_INVALID_CODE', 404);

        const { keyData, lookupKey } = found;
        const fingerprint = getFeedbackFingerprint(req, lookupKey);
        const feedbackComment = payload.feedback ?? payload.feedback_text ?? null;
        let activity = await db.get(
            'SELECT id, user_ign, user_region FROM code_activity WHERE lookup_key = ? AND feedback_fingerprint = ? ORDER BY used_at DESC LIMIT 1',
            [lookupKey, fingerprint]
        );

        if (!activity) {
            const cacheKey = `feedback_${lookupKey}_${fingerprint}`;
            const recentFeedback = typeof db.getCache === 'function' ? await db.getCache(cacheKey) : null;
            if (recentFeedback?.blocked) {
                return fail(res, 'XP_RATE_LIMITED', 'FEEDBACK_ALREADY_CAPTURED_RECENTLY', 429);
            }
            const inserted = await db.run(
                `INSERT INTO code_activity
                    (entry_code, lookup_key, user_ign, user_region, feedback_rating, feedback_comment, feedback_tag, feedback_source, feedback_fingerprint)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [entryCode || 'SHARED_LINK', lookupKey, 'Anonymous', 'Unknown', payload.rating, feedbackComment, payload.feedback_tag || null, payload.feedback_source || 'result_page', fingerprint]
            );
            activity = {
                id: inserted?.lastID || null,
                user_ign: 'Anonymous',
                user_region: 'Unknown'
            };
            if (typeof db.setCache === 'function') {
                await db.setCache(cacheKey, { blocked: true }, FEEDBACK_COOLDOWN_SECONDS);
            }
        } else {
            await db.run(
                'UPDATE code_activity SET feedback_rating = ?, feedback_comment = ?, feedback_tag = ?, feedback_source = ? WHERE id = ?',
                [payload.rating, feedbackComment, payload.feedback_tag || null, payload.feedback_source || 'result_page', activity.id]
            );
        }

        const likesCount = await db.get('SELECT COUNT(*) as likes_count FROM code_activity WHERE lookup_key = ? AND feedback_rating IS NOT NULL', [lookupKey]);
        if (typeof db.run === 'function') {
            if (entryCode) {
                await db.run('DELETE FROM transient_cache WHERE cache_key = ?', [`verify_${entryCode}`]).catch(() => {});
            }
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('live_event', {
                type: 'feedback',
                lookup_key: lookupKey,
                rating: payload.rating,
                feedback: feedbackComment ?? 'No comment',
                feedback_tag: payload.feedback_tag || null,
                user_ign: activity.user_ign || 'Anonymous',
                region: activity.user_region || 'Unknown',
                timestamp: new Date().toISOString()
            });
        }

        return res.json({ success: true, likes_count: likesCount?.likes_count || 0 });
    } catch (err) {
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_FEEDBACK_INPUT', 400, err.errors);
        console.error('FEEDBACK_ERR:', err);
        return res.status(500).json({ error: 'FEEDBACK_SYSTEM_ERROR' });
    }
});

router.get('/share-links', authenticateVendor, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT st.share_id, st.lookup_key, st.created_at, st.expires_at, st.last_accessed_at, st.access_count, st.revoked_at
            FROM share_tokens st
            JOIN sensitivity_keys sk ON sk.lookup_key = st.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY st.created_at DESC
            LIMIT 50
        `, [req.vendorId]);
        return res.json(rows);
    } catch (err) {
        console.error('SHARE_LINK_LIST_ERR:', err);
        return res.status(500).json({ error: 'SHARE_LINKS_UNAVAILABLE' });
    }
});

router.delete('/share-links/:shareId', authenticateVendor, async (req, res) => {
    try {
        const owner = await db.get(`
            SELECT st.share_id
            FROM share_tokens st
            JOIN sensitivity_keys sk ON sk.lookup_key = st.lookup_key
            WHERE st.share_id = ? AND sk.vendor_id = ?
            LIMIT 1
        `, [req.params.shareId, req.vendorId]);
        if (!owner) return res.status(404).json({ error: 'SHARE_LINK_NOT_FOUND' });
        await db.run('UPDATE share_tokens SET revoked_at = ? WHERE share_id = ?', [new Date(), req.params.shareId]);
        return res.json({ success: true });
    } catch (err) {
        console.error('SHARE_LINK_REVOKE_ERR:', err);
        return res.status(500).json({ error: 'SHARE_LINK_REVOKE_FAILED' });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
        const sort = req.query.sort === 'hits' ? 'hits' : 'likes';
        const orderBy = sort === 'hits' ? 'total_hits DESC, total_likes DESC' : 'total_likes DESC, total_hits DESC';
        const rows = await db.all(`
            SELECT
                v.vendor_id as vendor_id,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.display_name')), ''), v.vendor_id) as display_name,
                COALESCE(SUM(sk.current_usage), 0) as total_hits,
                COALESCE(SUM(CASE WHEN ca.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0) as total_likes,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.youtube')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.yt')), '')) as youtube,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.tiktok')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.tiktok')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.tt')), '')) as tiktok,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.discord')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.discord')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.dc')), '')) as discord
            FROM vendors v
            LEFT JOIN sensitivity_keys sk ON sk.vendor_id = v.vendor_id
            LEFT JOIN code_activity ca ON ca.lookup_key = sk.lookup_key
            WHERE v.status = 'active' AND v.role = 'vendor'
            GROUP BY v.vendor_id, v.brand_config
            ORDER BY ${orderBy}
            LIMIT ${limit}
        `);
        return res.json(rows.map((row, idx) => ({
            vendor_id: row.vendor_id,
            display_name: row.display_name || row.vendor_id,
            total_hits: row.total_hits || 0,
            total_likes: row.total_likes || 0,
            rank: idx + 1,
            youtube: row.youtube || '',
            tiktok: row.tiktok || '',
            discord: row.discord || ''
        })));
    } catch (err) {
        console.error('LEADERBOARD_ERR:', err);
        return res.status(500).json({ error: 'LEADERBOARD_UNAVAILABLE' });
    }
});

router.get('/code/:code/status', async (req, res) => {
    try {
        if (!req.params.code) return res.status(400).json({ error: 'Missing code' });
        const payload = await getCodeStatusPayload(req.params.code);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    } catch (err) {
        console.error('CODE_STATUS_ERR:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/share/:token/status', async (req, res) => {
    try {
        if (!req.params.token) return res.status(400).json({ error: 'Missing share token' });
        const payload = await getCodeStatusFromShareToken(req.params.token);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    } catch (err) {
        if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError' || err?.message === 'INVALID_SHARE_TOKEN') {
            return res.status(401).json({ error: 'INVALID_SHARE_TOKEN' });
        }
        console.error('SHARE_STATUS_ERR:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ALIAS ROUTES — bridge frontend calls (with /vendor/ prefix) to backend handlers
// These fix the URL mismatches discovered during audit.
// ─────────────────────────────────────────────────────────────────────────────

// 1. Vendor Profile read & write aliases
router.get('/vendor/profile', authenticateVendor, async (req, res) => {
    try {
        const vendor = await db.get(`
            SELECT vendor_id, status, active_until, brand_config, webhook_url, usage_limit, is_verified
            FROM vendors WHERE vendor_id = ?
        `, [req.vendorId]);
        if (!vendor) return res.status(404).json({ error: 'VENDOR_NOT_FOUND' });

        const stats = await db.get(`
            SELECT COUNT(*) as codes, COALESCE(SUM(current_usage), 0) as hits
            FROM sensitivity_keys WHERE vendor_id = ?
        `, [req.vendorId]);
        const likes = await db.get(`
            SELECT COUNT(*) as likes
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ? AND ca.feedback_rating IS NOT NULL
        `, [req.vendorId]);

        const config = normalizeBranding(vendor.brand_config);
        const now = new Date();
        const secondsLeft = vendor.active_until ? Math.max(0, Math.floor((new Date(vendor.active_until) - now) / 1000)) : null;

        return res.json({
            vendor_id: vendor.vendor_id,
            display_name: config.display_name || vendor.vendor_id,
            total_codes: stats?.codes || 0,
            total_hits: stats?.hits || 0,
            total_likes: likes?.likes || 0,
            status: vendor.status,
            active_until: vendor.active_until,
            seconds_left: secondsLeft,
            is_verified: !!vendor.is_verified,
            webhook_url: vendor.webhook_url || '',
            usage_limit: vendor.usage_limit ?? null,
            logo_url: config.logo_url || '',
            youtube: config.youtube || '',
            tiktok: config.tiktok || '',
            discord: config.discord || '',
            social_link: config.social_link || '',
            brand_config: config
        });
    } catch (err) {
        console.error('VENDOR_PROFILE_ALIAS_ERR:', err);
        return res.status(500).json({ error: 'VENDOR_PROFILE_UNAVAILABLE' });
    }
});

router.post('/vendor/profile', authenticateVendor, async (req, res) => {
    try {
        return res.json(await updateVendorProfile(req.vendorId, req.body));
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: err.errors });
        return res.status(500).json({ error: 'Server error' });
    }
});

// 2. Vendor branding alias (same as profile update)
router.post('/vendor/branding', authenticateVendor, async (req, res) => {
    try {
        return res.json(await updateVendorProfile(req.vendorId, req.body));
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: err.errors });
        return res.status(500).json({ error: 'BRANDING_UPDATE_FAILED' });
    }
});

// 3. Auto-generate alias (vendor/generate/auto → /generate handler)
router.post('/vendor/generate/auto', authenticateVendor, async (req, res) => {
    try {
        const { brand, series, model, ram, speed, claw, neuralScale } = z.object({
            brand: z.string().min(1),
            series: z.string().optional().nullable(),
            model: z.string().min(1),
            ram: z.coerce.number().int().min(1).max(32).optional().default(6),
            speed: z.string().optional().default('balanced'),
            claw: z.string().optional().default('3'),
            neuralScale: z.coerce.number().min(1).max(10).optional()
        }).parse(req.body || {});

        const results = Calculator.compute({
            brand,
            series: series || '',
            model,
            ram: ram || 6,
            speed: speed || 'balanced',
            claw: claw || '3',
            neuralScale: neuralScale || 5
        }, await getGlobalOffset());

        const created = await createVendorCode(req.vendorId, results, null);
        await trackEvent('code_generated', 'XP-CORE-ORG', req.vendorId, getClientIp(req), `${brand} ${model}`.trim());
        return res.json({ code: created.accessKey, accessKey: created.accessKey, lookupKey: created.lookupKey, results });
    } catch (err) {
        console.error('AUTO_GEN_ALIAS_ERR:', err);
        if (err instanceof z.ZodError) return fail(res, 'XP_VAL_FAILED', 'INVALID_GENERATION_INPUT', 400, err.errors);
        return res.status(500).json({ error: err.message || 'VAULT_GENERATION_FAILED' });
    }
});

// 4. Manual-generate alias (vendor/generate/manual → /manual-entry handler)
router.post('/vendor/generate/manual', authenticateVendor, async (req, res) => {
    try {
        const data = z.object({
            general: z.coerce.number().min(0).max(200),
            redDot: z.coerce.number().min(0).max(200),
            scope2x: z.coerce.number().min(0).max(200),
            scope4x: z.coerce.number().min(0).max(200),
            sniper: z.coerce.number().min(0).max(200),
            freeLook: z.coerce.number().min(0).max(200),
            ads: z.coerce.number().min(0).max(200).optional(),
            dpi: z.union([z.string(), z.number()]).optional(),
            fireButton: z.union([z.string(), z.number()]).optional(),
            advice: z.string().max(500).optional(),
            // also accept x/y fields from vendor_logic.js
            x: z.coerce.number().min(0).max(200).optional(),
            y: z.coerce.number().min(0).max(200).optional()
        }).parse(req.body || {});

        const general = data.general ?? data.x ?? 85;
        const redDot   = data.redDot  ?? data.y ?? 120;

        const results = {
            formula_version: Calculator.version,
            brand: 'MANUAL',
            model: 'PRESET',
            general,
            redDot,
            scope2x: data.scope2x ?? general,
            scope4x: data.scope4x ?? general,
            sniperScope: data.sniper ?? general,
            freeLook: data.freeLook ?? general,
            ads: data.ads ?? general,
            dpi: data.dpi || '600-640',
            fireButton: data.fireButton || '50-54',
            isManual: true
        };

        const created = await createVendorCode(req.vendorId, results, data.advice || null);
        await trackEvent('code_generated', 'XP-CORE-ORG', req.vendorId, getClientIp(req), 'MANUAL_PRESET');
        return res.json({ code: created.accessKey, accessKey: created.accessKey, lookupKey: created.lookupKey, results });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'MANUAL_PUBLISH_FAILED', details: err.errors });
        return res.status(500).json({ error: err.message || 'MANUAL_PUBLISH_FAILED' });
    }
});

// 5. Vendor keys aliases
router.get('/vendor/keys', authenticateVendor, async (req, res) => {
    try {
        const keys = await db.all(`
            SELECT lookup_key, current_usage, usage_limit, status, expires_at, created_at, results_json
            FROM sensitivity_keys
            WHERE vendor_id = ?
            ORDER BY created_at DESC
        `, [req.vendorId]);
        return res.json({ keys: keys.map((row) => ({ ...row, results_json: jsonOrObject(row.results_json, {}) })) });
    } catch (_err) {
        return res.status(500).json({ error: 'FAILED_TO_FETCH_KEYS' });
    }
});

router.delete('/vendor/keys/:lookupKey', authenticateVendor, async (req, res) => {
    try {
        await db.run('DELETE FROM sensitivity_keys WHERE lookup_key = ? AND vendor_id = ?', [req.params.lookupKey, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'REVOKE_FAILED' });
    }
});

// 6. Vendor presets aliases
router.get('/vendor/presets', authenticateVendor, async (req, res) => {
    try {
        const presets = await db.all('SELECT id, preset_name, config_json, created_at FROM vendor_presets WHERE vendor_id = ? ORDER BY created_at DESC', [req.vendorId]);
        return res.json(presets.map((preset) => ({ ...preset, config_json: jsonOrObject(preset.config_json, {}) })));
    } catch (_err) {
        return res.status(500).json({ error: 'FETCH_PRESETS_FAILED' });
    }
});

router.post('/vendor/presets', authenticateVendor, async (req, res) => {
    try {
        const { name, config } = z.object({ name: z.string().min(1).max(100), config: z.record(z.any()) }).parse(req.body || {});
        await db.run('INSERT INTO vendor_presets (vendor_id, preset_name, config_json) VALUES (?, ?, ?)', [req.vendorId, name, JSON.stringify(config)]);
        return res.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'SAVE_PRESET_FAILED', details: err.errors });
        return res.status(500).json({ error: 'SAVE_PRESET_FAILED' });
    }
});

router.delete('/vendor/presets/:id', authenticateVendor, async (req, res) => {
    try {
        await db.run('DELETE FROM vendor_presets WHERE id = ? AND vendor_id = ?', [req.params.id, req.vendorId]);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'DELETE_PRESET_FAILED' });
    }
});

// 7. Vendor stats, activity, export, insights aliases
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
        return res.json(stats);
    } catch (_err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/vendor/activity', authenticateVendor, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT ca.used_at, ca.user_ign, ca.user_region, ca.feedback_rating, sk.lookup_key
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
            LIMIT 50
        `, [req.vendorId]);
        return res.json(rows);
    } catch (_err) {
        return res.status(500).json({ error: 'ACTIVITY_UNAVAILABLE' });
    }
});

router.get('/vendor/export', authenticateVendor, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT ca.used_at, ca.user_ign, ca.user_region, ca.feedback_rating, ca.feedback_tag, sk.lookup_key
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
        `, [req.vendorId]);
        let csv = 'TIMESTAMP,IGN,REGION,LOOKUP_KEY,RATING,FEEDBACK_TAG\n';
        logs.forEach((row) => {
            csv += `${row.used_at},"${row.user_ign || ''}","${row.user_region || ''}",${row.lookup_key || ''},${row.feedback_rating || ''},"${row.feedback_tag || ''}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=xp_activity_${req.vendorId}.csv`);
        return res.status(200).send(csv);
    } catch (_err) {
        return res.status(500).json({ error: 'EXPORT_FAILED' });
    }
});

router.get('/vendor/insights', authenticateVendor, async (req, res) => {
    try {
        const overview = await db.get(`
            SELECT
                COUNT(DISTINCT sk.lookup_key) as total_profiles,
                COUNT(ca.id) as total_views,
                COALESCE(SUM(CASE WHEN ca.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0) as total_feedback,
                ROUND(AVG(ca.feedback_rating), 2) as average_rating
            FROM sensitivity_keys sk
            LEFT JOIN code_activity ca ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
        `, [req.vendorId]);
        const topRegions = await db.all(`
            SELECT ca.user_region as region, COUNT(*) as count
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            GROUP BY ca.user_region
            ORDER BY count DESC LIMIT 5
        `, [req.vendorId]);
        const totalViews = Number(overview?.total_views || 0);
        const totalFeedback = Number(overview?.total_feedback || 0);
        return res.json({
            total_profiles: Number(overview?.total_profiles || 0),
            total_views: totalViews,
            total_feedback: totalFeedback,
            average_rating: Number(overview?.average_rating || 0),
            feedback_conversion_pct: totalViews > 0 ? Math.round((totalFeedback / totalViews) * 1000) / 10 : 0,
            top_regions: topRegions
        });
    } catch (err) {
        console.error('VENDOR_INSIGHTS_ALIAS_ERR:', err);
        return res.status(500).json({ error: 'INSIGHTS_UNAVAILABLE' });
    }
});

// 8. Public stats route (unauthenticated — for stats.html)
router.get('/public/stats', async (_req, res) => {
    try {
        const stats = await db.get(`
            SELECT
                (SELECT COUNT(*) FROM vendors WHERE status = 'active') as active_vendors,
                (SELECT COUNT(*) FROM sensitivity_keys) as total_codes,
                (SELECT COALESCE(SUM(current_usage), 0) FROM sensitivity_keys) as total_hits
        `);
        const recentActivity = await db.all(`
            SELECT ca.used_at as ts, ca.user_ign, sk.vendor_id
            FROM code_activity ca
            LEFT JOIN sensitivity_keys sk ON sk.lookup_key = ca.lookup_key
            ORDER BY ca.used_at DESC
            LIMIT 10
        `);
        return res.json({
            active_vendors: Number(stats?.active_vendors || 0),
            total_codes: Number(stats?.total_codes || 0),
            total_hits: Number(stats?.total_hits || 0),
            recent_activity: recentActivity
        });
    } catch (err) {
        console.error('PUBLIC_STATS_ERR:', err);
        return res.status(500).json({ error: 'STATS_UNAVAILABLE' });
    }
});

module.exports = router;

