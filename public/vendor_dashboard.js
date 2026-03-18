async function api(url, options = {}) {
    options.credentials = 'include';
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    }
    
    try {
        const res = await fetch(url, options);
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = 'index.html';
                return null;
            }
            // Standardized Error Handling (10/10 Logic)
            const errorMsg = data.code ? `[${data.code}] ${data.message}` : (data.error || 'API_ERROR');
            if (window.notify) window.notify(errorMsg, 'error');
            console.warn('📡 API_STANDARD_FAILURE:', data);
            return null;
        }

        return data;
    } catch (e) {
        if (window.notify) window.notify('NEURAL_LINK_CRITICALLY_OFFLINE', 'error');
        console.error('📡 API_COMMUNICATION_CRASH:', e);
        return null;
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
    
    document.getElementById('tab_codes').classList.add('hidden');
    document.getElementById('tab_analytics').classList.add('hidden');
    document.getElementById('tab_profile').classList.add('hidden');
    document.getElementById('tab_' + tabId).classList.remove('hidden');
    
    document.querySelectorAll('.admin-bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.admin-bottom-nav .nav-btn[data-nav="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');
    if (tabId === 'analytics') loadAnalytics();
}

let currentSpeed = 'medium';
function setSpeed(val) {
    currentSpeed = val;
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-value="${val}"]`).classList.add('active');
}

async function generateCode() {
    const ign = document.getElementById('c_ign').value;
    if (!ign) return window.notify('Client ID required', 'warning');
    
    const ctx = {
        brand: document.getElementById('brandSelect').value,
        series: document.getElementById('seriesSelect').value,
        model: document.getElementById('modelSelect').value,
        speed: currentSpeed,
        claw: '2',
        ign: ign
    };
    
    if (!ctx.brand || !ctx.model) return window.notify('Select Device Profile', 'warning');
    
    const results = window.Calculator.compute(ctx);
    results.ign = ign;
    results.brand = ctx.brand;
    results.model = ctx.model;

    const limitVal = parseInt(document.getElementById('o_limit')?.value || '', 10);
    const expVal = parseInt(document.getElementById('o_exp')?.value || '', 10);
    const usage_limit = Number.isFinite(limitVal) && limitVal >= 0 ? limitVal : null;
    const expires_in_hours = Number.isFinite(expVal) && expVal > 0 ? expVal : null;

    const data = await api('/api/vault/generate', {
        method: 'POST',
        body: { results, usage_limit, expires_in_hours }
    });
    
    if (data && data.success) {
        document.getElementById('shareCode').textContent = data.entry_code;
        
        // Populate Preview
        document.getElementById('prevGeneral').textContent = results.general;
        document.getElementById('prevDPI').textContent = results.dpi;
        document.getElementById('prevRedDot').textContent = results.redDot;
        document.getElementById('prevFire').textContent = results.fireButton;
        
        document.getElementById('generatedOutput').classList.remove('hidden');
        window.notify(`CODE PROVISIONED: ${data.entry_code}`, 'success');
    }
}

async function loadAnalytics() {
    const codes = await api('/api/vault/codes');
    if (!codes) return;
    const statusFilter = document.getElementById('f_status')?.value || '';
    const q = (document.getElementById('f_search')?.value || '').trim().toLowerCase();

    let filtered = codes.slice();
    filtered = filtered.filter(c => {
        const resData = JSON.parse(c.results_json || '{}');
        const isExpired = c.status === 'expired' || (c.expires_at && new Date(c.expires_at) < new Date());
        const isLimit = c.usage_limit && c.current_usage >= c.usage_limit;
        if (statusFilter === 'expired' && !isExpired) return false;
        if (statusFilter === 'limit' && !isLimit) return false;
        if (statusFilter === 'active' && (isExpired || isLimit)) return false;
        if (q) {
            const txt = `${c.entry_code} ${(resData.ign || '')}`.toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    const total = filtered.length;
    const active = filtered.filter(c => {
        const isExpired = c.status === 'expired' || (c.expires_at && new Date(c.expires_at) < new Date());
        const isLimit = c.usage_limit && c.current_usage >= c.usage_limit;
        return !isExpired && !isLimit;
    }).length;
    const limitCount = filtered.filter(c => c.usage_limit && c.current_usage >= c.usage_limit).length;

    const statTotal = document.getElementById('statTotal');
    const statActive = document.getElementById('statActive');
    const statLimit = document.getElementById('statLimit');
    if (statTotal) statTotal.textContent = total;
    if (statActive) statActive.textContent = active;
    if (statLimit) statLimit.textContent = limitCount;

    const tbody = document.getElementById('analyticsBody');
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.4; padding:2rem;">NO MATCHES</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(c => {
        const resData = JSON.parse(c.results_json || '{}');
        const isExpired = c.status === 'expired' || (c.expires_at && new Date(c.expires_at) < new Date());
        const isLimit = c.usage_limit && c.current_usage >= c.usage_limit;
        const statusText = isExpired ? 'EXPIRED' : (isLimit ? 'LIMIT' : 'ACTIVE');
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
                <td style="padding: 0.75rem; font-weight: 800;">${c.entry_code}</td>
                <td style="padding: 0.75rem;">${resData.ign || 'USER'}</td>
                <td style="padding: 0.75rem;"><span class="logo-badge" style="font-size: 0.5rem; padding: 0.2rem 0.4rem;">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

async function updateProfile() {
    const primary = document.getElementById('p_color').value;
    const webhook_url = document.getElementById('p_webhook').value || null;
    
    // Validate Webhook URL if provided
    if (webhook_url && !webhook_url.startsWith('http')) {
        return window.notify('Invalid Webhook URL', 'error');
    }

    const data = await api('/api/vault/profile', {
        method: 'PUT',
        body: {
            brand_config: {
                colors: { primary }
            },
            webhook_url: webhook_url
        }
    });
    
    if (data && data.success) {
        window.notify('ECOSYSTEM SETTINGS SYNCED', 'success');
        document.documentElement.style.setProperty('--accent-primary', primary);
        localStorage.setItem('xp_last_branding', JSON.stringify({ colors: { primary } }));
        localStorage.setItem('xp_last_webhook', webhook_url || '');
    }
}

function handleLogout() {
    // Session is handled by HttpOnly cookie, but we clear local state
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- Neural Device Engine (Consolidated Logic) ---
function initDeviceSelection() {
    const brandSel = document.getElementById('brandSelect');
    const seriesSel = document.getElementById('seriesSelect');
    const modelSel = document.getElementById('modelSelect');

    if (!window.DEVICES) return console.warn('DEVICES_DATA_MISSING');

    // Populate Brands
    brandSel.innerHTML = '<option value="">BRAND</option>' + window.DEVICES.map(b => `<option value="${b.brand}">${b.brand}</option>`).join('');

    brandSel.onchange = () => {
        const brand = brandSel.value;
        const brandData = window.DEVICES.find(b => b.brand === brand);
        if (brandData) {
            seriesSel.innerHTML = '<option value="">SERIES</option>' + brandData.series.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            seriesSel.disabled = false;
        } else {
            seriesSel.innerHTML = '<option value="">SERIES</option>';
            seriesSel.disabled = true;
        }
        modelSel.innerHTML = '<option value="">MODEL</option>';
        modelSel.disabled = true;
    };

    seriesSel.onchange = () => {
        const brand = brandSel.value;
        const seriesName = seriesSel.value;
        const brandData = window.DEVICES.find(b => b.brand === brand);
        const seriesData = brandData?.series.find(s => s.name === seriesName);
        if (seriesData) {
            modelSel.innerHTML = '<option value="">MODEL</option>' + seriesData.models.map(m => `<option value="${m}">${m}</option>`).join('');
            modelSel.disabled = false;
        } else {
            modelSel.innerHTML = '<option value="">MODEL</option>';
            modelSel.disabled = true;
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab('codes');
    initDeviceSelection();
    const navHome = document.querySelector('.admin-bottom-nav .nav-btn[data-nav="codes"]');
    if (navHome) navHome.classList.add('active');
    const branding = JSON.parse(localStorage.getItem('xp_last_branding') || '{}');
    if (branding.colors && branding.colors.primary) {
        const pColor = document.getElementById('p_color');
        if (pColor) pColor.value = branding.colors.primary;
        document.documentElement.style.setProperty('--accent-primary', branding.colors.primary);
    }
    const savedWebhook = localStorage.getItem('xp_last_webhook');
    if (savedWebhook && document.getElementById('p_webhook')) {
        document.getElementById('p_webhook').value = savedWebhook;
    }

    const searchEl = document.getElementById('f_search');
    const statusEl = document.getElementById('f_status');
    function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
    const applyDebounced = debounce(loadAnalytics, 250);
    if (searchEl) searchEl.addEventListener('input', applyDebounced);
    if (statusEl) statusEl.addEventListener('change', loadAnalytics);
});

async function copyCode() {
    const code = document.getElementById('shareCode').textContent;
    await navigator.clipboard.writeText(code);
    window.notify('ACCESS CODE COPIED', 'success');
}

async function copyVerifyLink() {
    const code = document.getElementById('shareCode').textContent;
    const link = `${location.origin}/index.html`;
    await navigator.clipboard.writeText(link);
    window.notify('VERIFY LINK COPIED', 'success');
}
