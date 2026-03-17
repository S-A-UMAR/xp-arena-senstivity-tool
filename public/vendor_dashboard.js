const V_ACCESS = localStorage.getItem('xp_vendor_token');
const V_CONFIG = JSON.parse(localStorage.getItem('xp_vendor_config') || '{}');
let V_JWT = localStorage.getItem('xp_vendor_jwt') || '';
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById('tab_codes').classList.add('hidden');
    document.getElementById('tab_analytics').classList.add('hidden');
    document.getElementById('tab_profile').classList.add('hidden');
    document.getElementById('tab_' + tabId).classList.remove('hidden');
    if (tabId === 'analytics') loadAnalytics();
    if (tabId === 'profile') loadProfileForm();
}
async function ensureVendorToken() {
    if (V_JWT) return true;
    if (!V_ACCESS) return false;
    const res = await fetch('/api/vault/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: V_ACCESS })
    });
    if (!res.ok) return false;
    const data = await res.json();
    V_JWT = data.token;
    localStorage.setItem('xp_vendor_jwt', V_JWT);
    return true;
}
async function generateCode(mode) {
    const ok = await ensureVendorToken();
    if (!ok) return showToast('Unauthorized vendor', 'error');
    const ign = document.getElementById('c_ign').value;
    if (mode === 'smart' && !ign) return showToast('Enter Client IGN', 'warning');
    let results = null;
    let custom_results = null;
    if (mode === 'smart') {
        const ctx = {
            brand: document.getElementById('brandSelect').value,
            series: document.getElementById('seriesSelect').value,
            model: document.getElementById('modelSelect').value,
            ram: 8,
            speed: document.getElementById('v_speed').value,
            claw: document.getElementById('v_claw').value,
            ign: ign,
            campaign_tag: document.getElementById('c_tag').value || ''
        };
        if (!ctx.brand || !ctx.model) return showToast('Select Device', 'warning');
        results = Calculator.compute(ctx);
        results.ign = ign;
        results.brand = ctx.brand;
        results.series = ctx.series;
        results.model = ctx.model;
        results.campaign_tag = ctx.campaign_tag;
    } else {
        custom_results = {
            general: document.getElementById('o_gen').value || 95,
            redDot: document.getElementById('o_rd').value || 90,
            fireButton: document.getElementById('o_fbs').value || 65,
            dpi: document.getElementById('o_dpi').value || 411,
            campaign_tag: document.getElementById('c_tag').value || ''
        };
    }
    const body = {
        results,
        custom_results,
        usage_limit: document.getElementById('o_limit').value || null,
        expires_in_hours: document.getElementById('o_exp').value || null
    };
    const res = await fetch('/api/vault/generate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${V_JWT}`
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('shareCode').textContent = data.entry_code;
        document.getElementById('generatedOutput').classList.remove('hidden');
        if (window.SFX) window.SFX.play('ping');
        showToast(`Code Generated: ${data.entry_code}`, 'success');
    }
}
let currentPage = 1;
function prevPage() { if (currentPage > 1) { currentPage--; loadAnalytics(); } }
function nextPage() { currentPage++; loadAnalytics(); }
async function loadAnalytics() {
    const ok = await ensureVendorToken();
    if (!ok) return showToast('Unauthorized vendor', 'error');
    showSkeleton();
    const res = await fetchWithRetry('/api/vault/codes', {
        headers: { 'Authorization': `Bearer ${V_JWT}` }
    });
    let codes = await res.json();
    try { localStorage.setItem('xp_codes_cache', JSON.stringify(codes)); } catch {}
    const f_status = document.getElementById('f_status').value;
    const f_search = document.getElementById('f_search').value.trim().toLowerCase();
    if (f_status) {
        codes = codes.filter(c => {
            const isLimit = c.usage_limit && c.current_usage >= c.usage_limit;
            const isExpired = c.status === 'expired' || (c.expires_at && new Date(c.expires_at) < new Date());
            if (f_status === 'limit') return isLimit;
            if (f_status === 'expired') return isExpired;
            return !isLimit && !isExpired;
        });
    }
    if (f_search) {
        codes = codes.filter(c => {
            const resData = JSON.parse(c.results_json || '{}');
            const codeTxt = (c.entry_code || '').toLowerCase();
            const ignTxt = (resData.ign || '').toLowerCase();
            return codeTxt.includes(f_search) || ignTxt.includes(f_search);
        });
    }
    const tbody = document.getElementById('analyticsBody');
    tbody.innerHTML = '';
    let active = 0;
    let limitHits = 0;
    const size = parseInt(document.getElementById('pageSize').value || '10', 10);
    const totalPages = Math.max(1, Math.ceil(codes.length / size));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * size;
    const pageItems = codes.slice(start, start + size);
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; color:#94a3b8; padding:1.5rem;">
                    No codes found for current filters
                </td>
            </tr>
        `;
    }
    pageItems.forEach(c => {
        const resData = JSON.parse(c.results_json || '{}');
        const isLimit = c.usage_limit && c.current_usage >= c.usage_limit;
        const isExpired = c.status === 'expired' || (c.expires_at && new Date(c.expires_at) < new Date());
        if (isLimit) limitHits++;
        else if (!isExpired) active++;
        const status = isExpired ? '<span class="status-badge status-expired">EXPIRED</span>' : (isLimit ? '<span class="status-badge status-expired">LIMIT REACHED</span>' : '<span class="status-badge status-active">ACTIVE</span>');
        const usage = `${c.current_usage} / ${c.usage_limit || '∞'}`;
        const exp = c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'PERMANENT';
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:900; color:white;">${c.entry_code}</td>
                <td style="font-size:0.7rem;">${resData.ign || 'Manual Custom'}</td>
                <td>${status}</td>
                <td>${usage}</td>
                <td>${exp}</td>
                <td>
                    <button class="action-btn" onclick="promptExtend('${c.entry_code}')">Extend</button>
                    <button class="action-btn" onclick="promptLimit('${c.entry_code}')">Set Limit</button>
                    <button class="action-btn danger" onclick="deactivateCode('${c.entry_code}')">Deactivate</button>
                </td>
            </tr>
        `;
    });
    document.getElementById('statTotal').textContent = codes.length;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statLimit').textContent = limitHits;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} / ${totalPages}`;
}
function presetToday() {
    const d = new Date();
    const iso = d.toISOString().slice(0,10);
    document.getElementById('f_from').value = iso;
    document.getElementById('f_to').value = iso;
    loadAnalytics();
}
function preset7() {
    const d = new Date();
    const to = d.toISOString().slice(0,10);
    d.setDate(d.getDate() - 7);
    const from = d.toISOString().slice(0,10);
    document.getElementById('f_from').value = from;
    document.getElementById('f_to').value = to;
    loadAnalytics();
}
function preset30() {
    const d = new Date();
    const to = d.toISOString().slice(0,10);
    d.setDate(d.getDate() - 30);
    const from = d.toISOString().slice(0,10);
    document.getElementById('f_from').value = from;
    document.getElementById('f_to').value = to;
    loadAnalytics();
}
function presetAll() {
    document.getElementById('f_from').value = '';
    document.getElementById('f_to').value = '';
    loadAnalytics();
}
function loadProfileForm() {
    document.getElementById('p_name').value = V_CONFIG.vendor_id || '';
    document.getElementById('p_logo').value = V_CONFIG.logo || '';
    document.getElementById('p_color').value = (V_CONFIG.colors && V_CONFIG.colors.primary) || '#00f2fe';
    document.getElementById('p_yt').value = (V_CONFIG.socials && V_CONFIG.socials.yt) || '';
    document.getElementById('p_ig').value = (V_CONFIG.socials && V_CONFIG.socials.ig) || '';
}
async function updateProfile() {
    const ok = await ensureVendorToken();
    if (!ok) return showToast('Unauthorized vendor');
    const config = {
        vendor_id: document.getElementById('p_name').value,
        logo: document.getElementById('p_logo').value,
        colors: { primary: document.getElementById('p_color').value },
        socials: { 
            yt: document.getElementById('p_yt').value,
            ig: document.getElementById('p_ig').value 
        }
    };
    const res = await fetch('/api/vault/profile', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${V_JWT}`
        },
        body: JSON.stringify({ brand_config: config })
    });
    if (res.ok) {
        showToast('Profile saved', 'success');
        localStorage.setItem('xp_vendor_config', JSON.stringify(config));
        updatePreview();
    }
}
function updatePreview() {
    const config = {
        vendor_id: document.getElementById('p_name').value,
        logo: document.getElementById('p_logo').value,
        colors: { primary: document.getElementById('p_color').value },
        socials: { 
            yt: document.getElementById('p_yt').value,
            ig: document.getElementById('p_ig').value 
        }
    };
    const frame = document.getElementById('previewFrame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'XP_PREVIEW_UPDATE', config }, '*');
    }
}
function copyCode() {
    const code = document.getElementById('shareCode').textContent;
    navigator.clipboard.writeText(code);
    showToast('Code copied', 'success');
}
function populateDeviceSelects() {
    const b = document.getElementById('brandSelect');
    const s = document.getElementById('seriesSelect');
    const m = document.getElementById('modelSelect');
    window.DEVICES.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.brand;
        opt.textContent = d.brand;
        b.appendChild(opt);
    });
    b.addEventListener('change', () => {
        s.innerHTML = '<option value="">Select Series</option>';
        m.innerHTML = '<option value="">Select Model</option>';
        m.disabled = true;
        const brandData = window.DEVICES.find(d => d.brand === b.value);
        if (brandData) {
            s.disabled = false;
            brandData.series.forEach(se => {
                const opt = document.createElement('option');
                opt.value = se.name;
                opt.textContent = se.name;
                s.appendChild(opt);
            });
        } else {
            s.disabled = true;
        }
    });
    s.addEventListener('change', () => {
        m.innerHTML = '<option value="">Select Model</option>';
        const brandData = window.DEVICES.find(d => d.brand === b.value);
        const seriesData = brandData && brandData.series.find(se => se.name === s.value);
        if (seriesData) {
            m.disabled = false;
            seriesData.models.forEach(mm => {
                const opt = document.createElement('option');
                opt.value = mm;
                opt.textContent = mm;
                m.appendChild(opt);
            });
        } else {
            m.disabled = true;
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    if (document.readyState !== 'loading') { populateDeviceSelects(); } else { document.addEventListener('DOMContentLoaded', populateDeviceSelects); }
    document.getElementById('vendorDisplay').textContent = V_CONFIG.vendor_id || 'VENDOR DASHBOARD';
    const searchEl = document.getElementById('f_search');
    const statusEl = document.getElementById('f_status');
    const pageSizeEl = document.getElementById('pageSize');
    function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
    const applyDebounced = debounce(loadAnalytics, 250);
    if (searchEl) searchEl.addEventListener('input', applyDebounced);
    if (statusEl) statusEl.addEventListener('change', applyDebounced);
    if (pageSizeEl) pageSizeEl.addEventListener('change', () => { currentPage = 1; loadAnalytics(); });
});
function openWizard() {
  const m = document.getElementById('wizardModal');
  m.style.display = 'flex';
  document.getElementById('w_name').value = V_CONFIG.vendor_id || '';
  document.getElementById('w_logo').value = V_CONFIG.logo || '';
  document.getElementById('w_color').value = (V_CONFIG.colors && V_CONFIG.colors.primary) || '#00f2fe';
  document.getElementById('w_yt').value = (V_CONFIG.socials && V_CONFIG.socials.yt) || '';
  document.getElementById('w_ig').value = (V_CONFIG.socials && V_CONFIG.socials.ig) || '';
}
function closeWizard() {
  document.getElementById('wizardModal').style.display = 'none';
}
async function commitWizard() {
  const ok = await ensureVendorToken();
  if (!ok) return showToast('Unauthorized vendor', 'error');
  const config = {
    vendor_id: document.getElementById('w_name').value,
    logo: document.getElementById('w_logo').value,
    colors: { primary: document.getElementById('w_color').value },
    socials: { yt: document.getElementById('w_yt').value, ig: document.getElementById('w_ig').value }
  };
  const res = await fetch('/api/vault/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V_JWT}` },
    body: JSON.stringify({ brand_config: config })
  });
  if (res.ok) {
    localStorage.setItem('xp_vendor_config', JSON.stringify(config));
    document.getElementById('vendorDisplay').textContent = config.vendor_id || 'VENDOR DASHBOARD';
    updatePreview();
    closeWizard();
    showToast('Wizard Complete', 'success');
  } else {
    showToast('Failed to save', 'error');
  }
}
function vendorLogout() {
  localStorage.removeItem('xp_vendor_token');
  localStorage.removeItem('xp_vendor_jwt');
  localStorage.removeItem('xp_vendor_config');
  window.location.href = 'index.html';
}
function promptExtend(code) {
    const v = prompt('Extend by hours');
    const hours = parseInt(v, 10);
    if (!hours || hours <= 0) return;
    if (!confirm(`Extend code ${code} by ${hours} hours?`)) return;
    fetch(`/api/vault/code/${code}/extend`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V_JWT}` }, body: JSON.stringify({ hours }) }).then(() => { showToast('Expiry extended', 'success'); loadAnalytics(); });
}
function promptLimit(code) {
    const v = prompt('Set usage limit (empty for unlimited)');
    const limit = v === '' ? null : parseInt(v, 10);
    if (limit !== null && (isNaN(limit) || limit < 0)) return;
    if (!confirm(`Update limit for ${code} to ${limit === null ? 'unlimited' : limit}?`)) return;
    fetch(`/api/vault/code/${code}/limit`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V_JWT}` }, body: JSON.stringify({ limit }) }).then(() => { showToast('Limit updated', 'success'); loadAnalytics(); });
}
function deactivateCode(code) {
    if (!confirm(`Deactivate code ${code}?`)) return;
    fetch(`/api/vault/code/${code}/deactivate`, { method: 'PUT', headers: { 'Authorization': `Bearer ${V_JWT}` } }).then(() => { showToast('Code deactivated', 'warning'); loadAnalytics(); });
}
function loadPresets() {
    const list = JSON.parse(localStorage.getItem('xp_vendor_presets') || '[]');
    const box = document.getElementById('presetList');
    box.innerHTML = list.map((p, i) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.3rem;">
            <span style="font-size:0.8rem; color:#94a3b8;">${p.name}</span>
            <div>
                <button class="action-btn" onclick="applyPreset(${i})">Apply</button>
                <button class="action-btn danger" onclick="deletePreset(${i})">Delete</button>
            </div>
        </div>
    `).join('');
}
function savePreset() {
    const name = document.getElementById('p_name').value || `Preset-${Date.now()}`;
    const item = {
        name,
        general: document.getElementById('o_gen').value || 95,
        redDot: document.getElementById('o_rd').value || 90,
        fireButton: document.getElementById('o_fbs').value || 65,
        dpi: document.getElementById('o_dpi').value || 411
    };
    const list = JSON.parse(localStorage.getItem('xp_vendor_presets') || '[]');
    list.push(item);
    localStorage.setItem('xp_vendor_presets', JSON.stringify(list));
    loadPresets();
    document.getElementById('p_name').value = '';
}
function exportPresets() {
    const list = localStorage.getItem('xp_vendor_presets') || '[]';
    const blob = new Blob([list], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presets.json';
    a.click();
    URL.revokeObjectURL(url);
}
function importPresets(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const list = JSON.parse(reader.result);
            localStorage.setItem('xp_vendor_presets', JSON.stringify(list));
            loadPresets();
            showToast('Presets imported', 'success');
        } catch {
            showToast('Invalid presets file', 'error');
        }
    };
    reader.readAsText(file);
}
function exportCSV() {
    const rows = [['Code', 'IGN', 'Status', 'Usage', 'Expires']];
    document.querySelectorAll('#analyticsBody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 5) {
            rows.push([
                tds[0].innerText.trim(),
                tds[1].innerText.trim(),
                tds[2].innerText.trim(),
                tds[3].innerText.trim(),
                tds[4].innerText.trim()
            ]);
        }
    });
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codes.csv';
    a.click();
    URL.revokeObjectURL(url);
}
function copyVerifyLink() {
    const code = document.getElementById('shareCode').textContent;
    if (!code || code === '000000') { return showToast('Generate a code first', 'warning'); }
    const link = `${location.origin}/verify.html?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link);
    showToast('Verify link copied', 'success');
}
function shareWhatsApp() {
    const code = document.getElementById('shareCode').textContent;
    if (!code || code === '000000') { return showToast('Generate a code first'); }
    const link = `${location.origin}/verify.html?code=${encodeURIComponent(code)}`;
    const text = encodeURIComponent(`Your XP code: ${code}\nCheck status: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}
async function fetchWithRetry(url, options, retries = 2) {
    try {
        const res = await fetch(url, options);
        if (!res.ok && retries > 0) {
            await new Promise(r => setTimeout(r, 300));
            return fetchWithRetry(url, options, retries - 1);
        }
        return res;
    } catch (e) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 300));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw e;
    }
}
function showSkeleton(rows = 6) {
    const tbody = document.getElementById('analyticsBody');
    tbody.innerHTML = Array.from({ length: rows }).map(() => `
        <tr>
            <td style="opacity:0.5">██████</td>
            <td style="opacity:0.5">██████</td>
            <td style="opacity:0.5">██████</td>
            <td style="opacity:0.5">██████</td>
            <td style="opacity:0.5">██████</td>
            <td></td>
        </tr>
    `).join('');
}
function showToast(msg, type = 'info') {
    if (window.notify) window.notify(msg, type);
    else {
        // Fallback for safety
        const box = document.getElementById('toastBox');
        if (!box) return;
        const div = document.createElement('div');
        div.textContent = msg;
        div.style.background = 'rgba(15,23,42,0.9)';
        div.style.color = '#fff';
        div.style.padding = '0.6rem 0.9rem';
        box.appendChild(div);
        setTimeout(() => { div.remove(); }, 2500);
    }
}
function openPreviewModal() {
    document.getElementById('previewModal').style.display = 'flex';
}
function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
}
function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
}
function openHelp() {
    document.getElementById('helpModal').style.display = 'flex';
}
function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
}
