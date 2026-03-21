const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db');
const Calculator = require('../lib/calculator');

const router = express.Router();

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
    return 'XP_SECURE_FALLBACK_STATION_2026';
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
        await db.run(`
            INSERT INTO user_events (event_type, org_id, vendor_id, user_session_id, device_tier)
            VALUES (?, ?, ?, ?, ?)
        `, [type, orgId, vendorId, session, device]);
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
        const vendor = await db.get('SELECT webhook_url FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (!vendor?.webhook_url || typeof fetch !== 'function') return;
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
        const vendor = await db.get('SELECT vendor_id, status, active_until FROM vendors WHERE vendor_id = ?', [payload.vendor_id]);
        if (!vendor) return fail(res, 'XP_AUTH_INVALID', 'VENDOR_PROFILE_DELETED', 401);

        const now = new Date();
        const activeUntilOk = !vendor.active_until || new Date(vendor.active_until) > now;
        if (vendor.status !== 'active' || !activeUntilOk) {
            const reason = vendor.status !== 'active' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_EXPIRED';
            return fail(res, 'XP_AUTH_SUSPENDED', `VENDOR_${reason}`, 403);
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

async function buildVerificationPayload(keyData, rawCode = null) {
    let finalResults = jsonOrObject(keyData.results_json, {});
    const custom = jsonOrObject(keyData.custom_results_json, null);
    if (custom) finalResults = { ...finalResults, ...custom };
    if (keyData.creator_advice) finalResults = { ...finalResults, advice: keyData.creator_advice };

    const branding = normalizeBranding(keyData.brand_config);
    const vendor = keyData.vendor_id
        ? await db.get('SELECT usage_limit, active_until, webhook_url FROM vendors WHERE vendor_id = ?', [keyData.vendor_id])
        : null;
    const likesRow = await db.get('SELECT COUNT(*) as likes FROM code_activity WHERE lookup_key = ? AND feedback_rating IS NOT NULL', [keyData.lookup_key]);

    return {
        type: 'code',
        redirect: rawCode ? `/result.html?code=${encodeURIComponent(rawCode)}` : '/result.html',
        entry_code: rawCode || null,
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
        }
    };
}

async function getCodeRecordByRawCode(rawCode) {
    const lookupKey = getLookupKey(rawCode);
    const keyData = await db.get(`
        SELECT k.*, v.status as vendor_status, v.brand_config, v.active_until, v.usage_limit as vendor_usage_limit, v.org_id
        FROM sensitivity_keys k
        LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
        WHERE k.lookup_key = ?
    `, [lookupKey]);
    if (!keyData) return null;
    const isMatch = await bcrypt.compare(rawCode, keyData.entry_code);
    if (!isMatch) return null;
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

async function createVendorCode(vendorId, results, creatorAdvice = null, preferredCode = null) {
    const rawCode = preferredCode || `XP-${vendorId.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const lookupKey = getLookupKey(rawCode);
    const hashedCode = await bcrypt.hash(rawCode, 10);

    await db.run(`
        INSERT INTO sensitivity_keys (entry_code, lookup_key, vendor_id, results_json, creator_advice, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    `, [hashedCode, lookupKey, vendorId, JSON.stringify(results), creatorAdvice]);

    return { accessKey: rawCode, lookupKey };
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
        const { input, user_ign, user_region } = z.object({
            input: z.string().min(1),
            user_ign: z.string().optional(),
            user_region: z.string().optional()
        }).parse(req.body || {});

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

        const cached = typeof db.getCache === 'function' ? await db.getCache(`verify_${input}`) : null;
        if (cached) return res.json(cached);

        const vendor = await db.get('SELECT * FROM vendors WHERE lookup_key = ?', [getLookupKey(input)]);
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

        const { keyData, lookupKey } = found;
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

        const responsePayload = await buildVerificationPayload({ ...keyData, current_usage: (keyData.current_usage || 0) + 1 }, input);
        if (typeof db.setCache === 'function') {
            await db.setCache(`verify_${input}`, responsePayload, 300);
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
            SELECT vendor_id, status, active_until, brand_config, webhook_url, usage_limit
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

router.get('/export', authenticateVendor, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT ca.used_at, ca.user_ign, ca.user_region, ca.entry_code, ca.feedback_rating, sk.lookup_key
            FROM code_activity ca
            JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key
            WHERE sk.vendor_id = ?
            ORDER BY ca.used_at DESC
        `, [req.vendorId]);
        let csv = 'TIMESTAMP,IGN,REGION,ENTRY_CODE,LOOKUP_KEY,RATING\n';
        logs.forEach((row) => {
            csv += `${row.used_at},"${row.user_ign || ''}","${row.user_region || ''}","${row.entry_code || ''}",${row.lookup_key || ''},${row.feedback_rating || ''}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=xp_activity_${req.vendorId}.csv`);
        return res.status(200).send(csv);
    } catch (_err) {
        return res.status(500).json({ error: 'EXPORT_FAILED' });
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
        const events = await db.all('SELECT event_type, COUNT(*) as count FROM user_events GROUP BY event_type');
        const counts = { landing_view: 0, calibration_start: 0, code_generated: 0, result_view: 0 };
        events.forEach((event) => {
            if (Object.prototype.hasOwnProperty.call(counts, event.event_type)) counts[event.event_type] = event.count;
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
    } catch (_err) {
        return res.status(500).json({ error: 'REVOKE_FAILED' });
    }
});

router.get('/admin/vendors', authenticateAdmin, async (_req, res) => {
    try {
        const vendors = await db.all(`
            SELECT v.*,
                   TIMESTAMPDIFF(SECOND, NOW(), v.active_until) as seconds_left,
                   (SELECT COUNT(*) FROM sensitivity_keys WHERE vendor_id = v.vendor_id) as total_codes,
                   (SELECT COUNT(*) FROM code_activity ca JOIN sensitivity_keys sk ON ca.lookup_key = sk.lookup_key WHERE sk.vendor_id = v.vendor_id) as total_usage
            FROM vendors v
            ORDER BY v.created_at DESC
        `);
        return res.json(vendors.map((vendor) => ({ ...vendor, brand_config: jsonOrObject(vendor.brand_config, {}) })));
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
        const { vendorId: requestedId, orgId: rawOrgId, usageLimit, durationDays, brandConfig } = z.object({
            vendorId: z.string().min(2).optional(),
            orgId: z.string().optional(),
            usageLimit: z.number().int().min(0).nullable().optional(),
            durationDays: z.number().int().min(1).optional(),
            brandConfig: z.record(z.any()).optional()
        }).parse(req.body || {});

        const orgId = (rawOrgId || 'XP-CORE-ORG').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const normalizedRequestedId = requestedId
            ? requestedId.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
            : '';
        const vendorId = normalizedRequestedId || `VNDR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const existing = await db.get('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorId]);
        if (existing) return res.status(409).json({ error: 'VENDOR_ALREADY_EXISTS' });

        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const accessKey = `XP-${vendorId}-${randomDigits}`;
        const hashedAccessKey = await bcrypt.hash(accessKey, 10);
        const lookupKey = getLookupKey(accessKey);

        let activeUntil = null;
        if (durationDays) {
            const date = new Date();
            date.setDate(date.getDate() + durationDays);
            activeUntil = date.toISOString().slice(0, 19).replace('T', ' ');
        }

        const orgName = rawOrgId || 'XP ARENA GLOBAL';
        await db.run("INSERT IGNORE INTO organizations (org_id, org_name, plan_tier) VALUES (?, ?, 'enterprise')", [orgId, orgName]);
        await db.run(`
            INSERT INTO vendors (org_id, vendor_id, access_key, lookup_key, usage_limit, active_until, brand_config, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `, [orgId, vendorId, hashedAccessKey, lookupKey, usageLimit ?? null, activeUntil, JSON.stringify(brandConfig || {})]);
        await logAudit('admin', 'SYSTEM', 'VENDOR_REGISTER', { vendorId, accessKey }, getClientIp(req));
        return res.json({ success: true, message: 'VENDOR REGISTERED SUCCESSFULLY', vendorId, accessKey });
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
        await db.run('DELETE FROM sensitivity_keys WHERE vendor_id = ?', [req.params.vendorId]);
        await db.run('DELETE FROM vendors WHERE vendor_id = ?', [req.params.vendorId]);
        return res.json({ success: true, message: `VENDOR ${req.params.vendorId} DELETED PERMANENTLY` });
    } catch (err) {
        console.error('DELETE /admin/vendor error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/vendors/:vendorId', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM sensitivity_keys WHERE vendor_id = ?', [req.params.vendorId]);
        await db.run('DELETE FROM vendors WHERE vendor_id = ?', [req.params.vendorId]);
        return res.json({ success: true, message: `VENDOR ${req.params.vendorId} DELETED PERMANENTLY` });
    } catch (err) {
        console.error('DELETE /admin/vendors error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/settings', authenticateAdmin, async (_req, res) => {
    try {
        const settings = await db.all('SELECT * FROM system_settings');
        return res.json(settings);
    } catch (_err) {
        return res.status(500).json({ error: 'SETTINGS_UNAVAILABLE' });
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
        const vendor = vendor_id ? await db.get('SELECT org_id FROM vendors WHERE vendor_id = ?', [vendor_id]) : null;
        await trackEvent(event_type, vendor?.org_id || 'XP-CORE-ORG', vendor_id || 'XP-PUBLIC', session_id || getClientIp(req), device || 'unknown');
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
            rating: z.number().int().min(1).max(5),
            feedback: z.string().max(500).optional(),
            feedback_text: z.string().max(500).optional()
        }).refine((data) => data.code || data.entry_code, 'CODE_REQUIRED').parse(req.body || {});

        const entryCode = payload.code || payload.entry_code;
        const lookupKey = getLookupKey(entryCode);
        const activity = await db.get('SELECT id, user_ign, user_region FROM code_activity WHERE lookup_key = ? ORDER BY used_at DESC LIMIT 1', [lookupKey]);
        if (!activity) return fail(res, 'XP_VAL_NOT_FOUND', 'SESSION_NOT_FOUND', 404);

        await db.run('UPDATE code_activity SET feedback_rating = ?, feedback_comment = ? WHERE id = ?', [payload.rating, payload.feedback ?? payload.feedback_text ?? null, activity.id]);
        const likesCount = await db.get('SELECT COUNT(*) as likes_count FROM code_activity WHERE lookup_key = ? AND feedback_rating IS NOT NULL', [lookupKey]);
        if (typeof db.run === 'function') {
            await db.run('DELETE FROM transient_cache WHERE cache_key = ?', [`verify_${entryCode}`]).catch(() => {});
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('live_event', {
                type: 'feedback',
                lookup_key: lookupKey,
                rating: payload.rating,
                feedback: payload.feedback ?? payload.feedback_text ?? 'No comment',
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

router.get('/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
        const sort = req.query.sort === 'hits' ? 'hits' : 'likes';
        const orderBy = sort === 'hits' ? 'total_hits DESC, total_likes DESC' : 'total_likes DESC, total_hits DESC';
        const rows = await db.all(`
            SELECT
                v.vendor_id,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.display_name')), ''), v.vendor_id) as display_name,
                COALESCE(SUM(sk.current_usage), 0) as total_hits,
                COALESCE(SUM(CASE WHEN ca.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0) as total_likes,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.youtube')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.yt')), '')) as youtube,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.tiktok')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.tiktok')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.tt')), '')) as tiktok,
                COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.discord')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.discord')), ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.brand_config, '$.socials.dc')), '')) as discord
            FROM vendors v
            LEFT JOIN sensitivity_keys sk ON sk.vendor_id = v.vendor_id
            LEFT JOIN code_activity ca ON ca.lookup_key = sk.lookup_key
            WHERE v.status = 'active'
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

module.exports = router;
