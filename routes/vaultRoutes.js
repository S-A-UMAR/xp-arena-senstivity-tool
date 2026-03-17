const express = require('express');
const router = express.Router();
const { db } = require('../db');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

function parseBearer(header) {
    if (!header) return null;
    const parts = header.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
    return null;
}

function authenticateVendor(req, res, next) {
    try {
        const token = parseBearer(req.headers['authorization']);
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.vendorId = payload.vendor_id;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

function authenticateAdmin(req, res, next) {
    try {
        const token = parseBearer(req.headers['authorization']);
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
router.post('/verify', async (req, res) => {
    try {
        const schema = z.object({
            input: z.string().min(1),
            user_ign: z.string().optional(),
            user_region: z.string().optional()
        });
        const { input, user_ign, user_region } = schema.parse(req.body); 
        const adminSecret = process.env.ADMIN_SECRET;

        if (!input) {
            return res.status(400).json({ error: 'Code is required' });
        }

        // 1. Check Master Admin Secret
        if (input === adminSecret) {
            return res.json({
                type: 'admin',
                redirect: '/vendor_panel.html',
                message: 'MASTER ACCESS GRANTED'
            });
        }

        // 2. Check Vendor Access Key
        const vendor = await db.get('SELECT * FROM vendors WHERE access_key = ?', [input]);
        if (vendor) {
            if (vendor.status === 'suspended') {
                return res.status(403).json({ error: 'PROVIDER SUSPENDED - ACCESS DENIED' });
            }
            const token = jwt.sign({ vendor_id: vendor.vendor_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                type: 'vendor',
                redirect: '/vendor_dashboard.html',
                vendor: {
                    id: vendor.vendor_id,
                    config: typeof vendor.brand_config === 'string' ? JSON.parse(vendor.brand_config) : vendor.brand_config
                },
                token,
                message: 'VENDOR DASHBOARD UNLOCKED'
            });
        }

        // 3. Check User Entry Code (Sensitivity Key)
        const keyData = await db.get(`
            SELECT k.*, v.status as vendor_status, v.brand_config, v.org_id
            FROM sensitivity_keys k
            LEFT JOIN vendors v ON k.vendor_id = v.vendor_id
            WHERE k.entry_code = ?
        `, [input]);

        if (keyData) {
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

            return res.json({
                type: 'user',
                redirect: '/result.html',
                results: finalResults,
                branding: typeof keyData.brand_config === 'string' ? JSON.parse(keyData.brand_config) : keyData.brand_config,
                message: 'CALIBRATION DATA RETRIEVED'
            });
        }

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
        res.json({ token });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/vendor/login', async (req, res) => {
    try {
        const schema = z.object({ access_key: z.string().min(6) });
        const { access_key } = schema.parse(req.body || {});
        if (!access_key) return res.status(400).json({ error: 'Missing access key' });
        const vendor = await db.get('SELECT vendor_id, status FROM vendors WHERE access_key = ?', [access_key]);
        if (!vendor || vendor.status !== 'active') return res.status(401).json({ error: 'Unauthorized' });
        const token = jwt.sign({ vendor_id: vendor.vendor_id }, process.env.JWT_SECRET || 'xparena_ultra_secure_777', { expiresIn: '7d' });
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

        await db.run(`
            INSERT INTO sensitivity_keys (entry_code, vendor_id, results_json, custom_results_json, usage_limit, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            entry_code, 
            vendorId, 
            JSON.stringify(results || {}), 
            custom_results ? JSON.stringify(custom_results) : null,
            usage_limit || null,
            expires_at
        ]);

        res.json({ success: true, entry_code });
    } catch (e) {
        console.error('Gen Error:', e);
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
        res.status(500).json({ error: 'Server error' });
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
            })
        });
        const { brand_config } = schema.parse(req.body);
        const vendorId = req.vendorId;

        await db.run('UPDATE vendors SET brand_config = ? WHERE vendor_id = ?', [JSON.stringify(brand_config), vendorId]);
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
                (SELECT COUNT(*) FROM code_activity) as usage_total
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

        await db.run(`
            INSERT INTO vendors (vendor_id, access_key, brand_config, status)
            VALUES (?, ?, ?, 'active')
        `, [vendorId, accessKey, typeof brandConfig === 'string' ? brandConfig : JSON.stringify(brandConfig || {})]);

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
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.run('UPDATE vendors SET status = ? WHERE vendor_id = ?', [status, vendorId]);
        
        await logAudit('admin', 'SYSTEM', 'VENDOR_STATUS_CHANGE', { vendorId, status }, req.ip);

        res.json({ success: true, message: `VENDOR ${status.toUpperCase()} SUCCESSFULLY` });
    } catch (e) {
        console.error('POST /admin/vendor/status error:', e);
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
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

// Public API Gateway: Execute Neural Math for external platforms
router.post('/public/calculate', async (req, res) => {
    try {
        const schema = z.object({
            api_key: z.string().min(10), // Required for enterprise tracking
            state: z.record(z.any())
        });
        const { api_key, state } = schema.parse(req.body);

        // Verify API Key (Mock verification for now)
        const vendor = await db.get('SELECT * FROM vendors WHERE access_key = ?', [api_key]);
        if (!vendor) return res.status(401).json({ error: 'INVALID_API_KEY' });

        // Logic check: Calculator is available globally in the project, but we need to ensure it's required correctly in the backend context if needed.
        // For this implementation, we assume the math exists as a module or shared lib.
        // const results = Calculator.compute(state); 

        res.json({
            success: true,
            provider: vendor.vendor_id,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: 'API_GATEWAY_ERR' });
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
