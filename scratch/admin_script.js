  <script>
    /* --- ADMIN MASTER LOGIC - AXP Neural Nexus v6 --- */
    let dashboardPoller = null;
    let allVendorsCache = [];
    let selectedTier = 'normal';
    const ADMIN_TOKEN_KEY = 'axp_admin_token';

    /* --- AUTH & FETCH CORE --- */
    function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; }
    function setAdminToken(token) { if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token); }
    function clearAdminToken() { localStorage.removeItem(ADMIN_TOKEN_KEY); }

    async function adminFetch(url, options = {}) {
      const { autoRedirect401 = true, ...fetchOptions } = options;
      const token = getAdminToken();
      const headers = { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
      if (autoRedirect401 && res.status === 401) {
        clearAdminToken();
        window.location.href = 'index.html?admin=required';
        throw new Error('ADMIN_SESSION_REQUIRED');
      }
      return res;
    }
    window.adminFetch = adminFetch;

    /* --- API WRAPPER --- */
    async function api(path, method = 'GET', body = null) {
      const res = await adminFetch(path, { method, body: body ? JSON.stringify(body) : null });
      if (res.status === 401) { logoutAdmin(); return null; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || `API_ERR_${res.status}`);
      return data;
    }
    window.api = api;

    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    /* --- AUTH HANDLERS --- */
    let gateBusy = false;
    async function checkPass() {
      if (gateBusy) return;
      const pass = document.getElementById('adminPass').value.trim();
      const status = document.getElementById('gateStatus');
      const btn = document.getElementById('adminUnlockBtn');
      if (!pass) { status.textContent = 'KEY_REQUIRED'; return; }

      try {
        gateBusy = true;
        btn.textContent = 'ESTABLISHING_UPLINK...';
        btn.disabled = true;
        status.textContent = 'CONNECTING...';

        const res = await adminFetch('/api/vault/admin/login', {
          autoRedirect401: false,
          method: 'POST',
          body: JSON.stringify({ password: pass })
        });
        let payload = {};
        try { payload = await res.json(); } catch(_) {}

        if (res.ok && (payload.type === 'admin' || payload.token)) {
          if (payload.token) setAdminToken(payload.token);
          status.textContent = 'ACCESS_GRANTED';
          setTimeout(unlockAdminPanel, 500);
        } else {
          status.textContent = payload.error || 'ACCESS_DENIED';
          btn.textContent = 'UPLINK_CORE_ENGINE';
          btn.disabled = false;
        }
      } catch (e) {
        status.textContent = 'NODE_TIMEOUT';
        btn.textContent = 'UPLINK_CORE_ENGINE';
        btn.disabled = false;
      } finally { gateBusy = false; }
    }
    window.checkPass = checkPass;

    function logoutAdmin() {
      clearAdminToken();
      window.location.href = 'index.html?logout=true';
    }

    function unlockAdminPanel() {
      document.getElementById('privateGate').classList.add('hidden');
      document.getElementById('mainPanel').classList.remove('hidden');
      initToolDevices();
      loadDashboard();
      if (dashboardPoller) return;
      dashboardPoller = setInterval(() => loadDashboard().catch(()=>{}), 15000);
    }

    function showAdminGate() {
      document.getElementById('mainPanel').classList.add('hidden');
      document.getElementById('privateGate').classList.remove('hidden');
    }

    /* --- Tab Navigation --- */
    function switchTab(tabId, el) {
      document.querySelectorAll('.nav-section').forEach(s => s.classList.add('hidden'));
      document.getElementById(`section-${tabId}`)?.classList.remove('hidden');
      document.querySelectorAll('.anav-item').forEach(n => n.classList.remove('active'));
      if (el) el.classList.add('active');
      if (tabId === 'analytics') { loadSecurityLogs(); loadOrgStats(); }
      if (tabId === 'vendors') { renderVendorCards(allVendorsCache); }
    }

    function toggleActionSheet(show) {
      document.getElementById('sheetOverlay').classList.toggle('active', show);
      document.getElementById('vendorSheet').classList.toggle('active', show);
      if (show) {
        document.getElementById('vName').value = '';
        document.getElementById('vDuration').value = '';
        document.getElementById('vUsageLimit').value = '';
        document.getElementById('vLogo').value = '';
        selectTier('normal');
      }
    }

    /* --- Tier Selection --- */
    function selectTier(tier) {
      selectedTier = tier;
      document.querySelectorAll('.tier-btn').forEach(b => {
        b.dataset.active = (b.dataset.tier === tier) ? 'true' : 'false';
      });
    }

    /* --- Offset --- */
    let offsetTimer;
    function updateOffsetDisplay(val) {
      document.getElementById('offsetVal').textContent = parseFloat(val).toFixed(2) + 'x';
      clearTimeout(offsetTimer);
      offsetTimer = setTimeout(async () => {
        try {
          await api('/api/vault/admin/settings', 'POST', { key: 'global_sensitivity_offset', value: val });
          if (window.notify) window.notify('SENS_OFFSET_SYNCED', 'success');
        } catch (e) { if (window.notify) window.notify('SYNC_FAILED: ' + e.message, 'error'); }
      }, 800);
    }

    /* --- Dashboard Load --- */
    async function loadDashboard() {
      try {
        const [stats, vendors, settings] = await Promise.all([
          api('/api/vault/admin/stats'),
          api('/api/vault/admin/vendors'),
          api('/api/vault/admin/settings')
        ]);

        document.getElementById('totalVendors').textContent = stats?.vendors ?? 0;
        document.getElementById('totalUsage').textContent = stats?.usage_total ?? 0;
        document.getElementById('totalCodes').textContent = stats?.codes ?? 0;
        const load = Math.min(100, Math.round((stats?.usage_total || 0) / 10));
        document.getElementById('loadVal').textContent = load + '%';
        document.getElementById('loadBar').style.width = load + '%';

        if (Array.isArray(settings)) {
          const offset = settings.find(s => s.setting_key === 'global_sensitivity_offset');
          if (offset) {
            document.getElementById('globalOffset').value = offset.setting_value;
            document.getElementById('offsetVal').textContent = parseFloat(offset.setting_value).toFixed(2) + 'x';
          }
        }

        allVendorsCache = Array.isArray(vendors) ? vendors : [];
        renderVendorCards(allVendorsCache);
        document.getElementById('vendorCountChip').textContent = allVendorsCache.length + ' NODES';
        document.getElementById('lastSyncLabel').textContent = 'SYNCED_' + new Date().toLocaleTimeString().split(' ')[0];

        loadLiveFeed();
      } catch (e) {
        console.error('DASH_ERR:', e);
        document.getElementById('lastSyncLabel').textContent = 'SYNC_FAILED';
        if (window.notify) window.notify(`ADMIN_SYNC_ERROR: ${e.message || 'UNKNOWN'}`, 'error');
      }
    }

    /* --- Org Analytics --- */
    async function loadOrgStats() {
      try {
        const orgStats = await api('/api/vault/org/stats');
        const funnel = document.getElementById('funnelSteps');
        if (!orgStats?.funnel?.length) {
          funnel.innerHTML = '<div class="text-center py-4 opacity-30 text-xs font-mono">NO_ANALYTICS_DATA</div>';
          return;
        }
        const maxVal = orgStats.funnel[0].val || 1;
        funnel.innerHTML = orgStats.funnel.map(step => `
          <div class="funnel-step">
            <div class="funnel-step-label">${esc(step.label)}</div>
            <div class="funnel-step-val">${step.val}</div>
            <div class="funnel-step-pct">${Math.round((step.val / maxVal) * 100)}% RETENTION</div>
          </div>
        `).join('');
      } catch (e) { console.warn('ORG_STATS_ERR:', e); }
    }

    /* --- Live Feed --- */
    async function loadLiveFeed() {
      const feed = document.getElementById('liveFeed');
      try {
        const events = await api('/api/vault/admin/live-feed');
        if (!events?.length) {
          feed.innerHTML = '<div class="text-center py-4 opacity-30 text-xs font-mono">NO_RECENT_ACTIVITY</div>';
          return;
        }
        feed.innerHTML = events.map(ev => `
          <div class="log-row">
            <div>
              <div class="log-type">${ev.type === 'feedback' ? '[FBK]' : '[HIT]'}</div>
              <div style="color: var(--tx-hero); font-size: 0.65rem;">${esc(ev.user_ign || 'ANON')}</div>
            </div>
            <div class="log-meta">
              <div>${esc(ev.region || ev.user_region || 'GLB')}</div>
              <div style="opacity: 0.5;">${ev.type === 'feedback' ? 'star ' + (ev.feedback || 'RATED') : ''}</div>
            </div>
          </div>
        `).join('');
      } catch(_) { feed.innerHTML = '<div class="text-center py-4 opacity-20 text-xs font-mono">FEED_UNAVAILABLE</div>'; }
    }

    /* --- Security Logs --- */
    async function loadSecurityLogs() {
      const box = document.getElementById('securityLogs');
      try {
        const logs = await api('/api/vault/admin/security-logs');
        if (!logs?.length) {
          box.innerHTML = '<div class="text-center py-4 opacity-20 text-xs font-mono">NO_SECURITY_EVENTS</div>';
          return;
        }
        box.innerHTML = logs.map(l => `
          <div class="log-row">
            <div>
              <div class="log-type">${esc(l.event_type)}</div>
              <div style="color: var(--tx-muted); font-size: 0.55rem;">${esc(l.ip_address)}</div>
            </div>
            <div class="log-meta">
              <div>${new Date(l.created_at).toLocaleTimeString()}</div>
              <div style="opacity:0.5;">${new Date(l.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        `).join('');
      } catch(_) { box.innerHTML = '<div class="text-center py-4 text-error text-xs font-mono">LOG_READ_ERR</div>'; }
    }

    /* --- Vendor Cards --- */
    function applyVendorFilter() {
      const term = document.getElementById('vendorSearch').value.toLowerCase().trim();
      const filtered = !term ? allVendorsCache : allVendorsCache.filter(v => v.vendor_id.toLowerCase().includes(term));
      renderVendorCards(filtered);
    }

    function renderVendorCards(vendors) {
      const container = document.getElementById('vendorCardsContainer');
      document.getElementById('vendorCountChip').textContent = vendors.length + ' NODES';
      if (!vendors.length) {
        container.innerHTML = '<div class="text-center py-8 opacity-20 text-xs font-mono">NO_VENDORS_BUFFERED</div>';
        return;
      }
      const tierColor = { gold: '#f59e0b', premium: '#a855f7', normal: '#00e5ff' };
      container.innerHTML = vendors.map(v => {
        const tier = v.tier || 'normal';
        const daysLeft = v.seconds_left != null ? Math.max(0, Math.floor(v.seconds_left / 86400)) : null;
        const color = tierColor[tier] || '#00e5ff';
        return `
          <div class="registry-node anim-up animate-slide-in-left">
            <div class="node-header">
              <div>
                <div style="font-size:0.5rem; color:${color}; font-weight:900; letter-spacing:0.1em; margin-bottom:3px;">${tier.toUpperCase()}_NODE - ${esc(v.org_id || 'AXP_CORE')}</div>
                <div class="node-title">${esc(v.vendor_id.toUpperCase())}</div>
              </div>
              <div class="node-status ${v.status === 'active' ? 'status-active animate-pulse-glow' : 'status-suspended'}">${v.status.toUpperCase()}</div>
            </div>
            <div class="node-meta">
              <div class="node-meta-item">
                <div class="node-meta-label">KEYS</div>
                <div class="node-meta-val" style="color: var(--cyan);">${v.total_codes || 0}</div>
              </div>
              <div class="node-meta-item">
                <div class="node-meta-label">HITS</div>
                <div class="node-meta-val">${v.total_usage || 0}</div>
              </div>
              <div class="node-meta-item">
                <div class="node-meta-label">EXPIRES</div>
                <div class="node-meta-val" style="color: ${daysLeft != null && daysLeft < 7 ? 'var(--error)' : 'var(--gold)'};">${daysLeft != null ? daysLeft + 'D' : 'inf'}</div>
              </div>
            </div>
            <div class="node-actions">
              <button class="node-btn" onclick="showAnalytics('${esc(v.vendor_id)}',${v.total_codes||0},${v.total_usage||0}); window.GamingEffects?.screenGlitch(100);">LOGS</button>
              <button class="node-btn" onclick="toggleStatus('${esc(v.vendor_id)}','${v.status}'); window.GamingEffects?.screenGlitch(150);">${v.status === 'active' ? 'SUSPEND' : 'RESTORE'}</button>
              <button class="node-btn" onclick="downloadExistingVendorCard('${esc(v.vendor_id)}','${tier}','${daysLeft!=null?daysLeft:\"inf\"}'); window.GamingEffects?.showSuccess('ID Card Downloaded');">ID CARD</button>
              <button class="node-btn danger" onclick="deleteVendor('${esc(v.vendor_id)}'); window.GamingEffects?.screenGlitch(200);">ERASE</button>
            </div>
          </div>
        `;
      }).join('');
      
      setTimeout(() => {
        document.querySelectorAll('.registry-node').forEach((node, idx) => {
          node.style.animationDelay = (idx * 0.1) + 's';
        });
      }, 0);
    }

    /* --- Vendor Actions --- */
    async function addVendor() {
      const vid = document.getElementById('vName').value.trim().toUpperCase();
      const vDays = parseInt(document.getElementById('vDuration').value) || 30;
      const vLimit = document.getElementById('vUsageLimit').value.trim();
      const logo = document.getElementById('vLogo').value.trim();
      if (!vid) { if (window.notify) window.notify('NODE_ID_REQUIRED', 'error'); return; }

      const btn = document.querySelector('#vendorSheet .btn-cta');
      btn.textContent = 'PROVISIONING...'; btn.disabled = true;
      if(window.GamingEffects) window.GamingEffects.showLoadingBar(1500);
      try {
        const res = await api('/api/vault/admin/vendors', 'POST', {
          vendorId: vid,
          durationDays: vDays,
          usageLimit: vLimit ? parseInt(vLimit) : null,
          tier: selectedTier,
          brandConfig: { display_name: vid, logo_url: logo || null }
        });
        if (!res) return;
        document.getElementById('cardToCapture').innerHTML = `
          <div style="text-align:center; padding: 0.5rem 0 1rem;">
            <div class="badge-gold mb-3">${selectedTier.toUpperCase()}_NODE_PROVISIONED</div>
            <div style="font-size:1.4rem; font-weight:900; color:#fff; margin-bottom:1rem;">${esc(res.vendorId || vid)}</div>
            <div style="font-size:0.65rem; color:var(--tx-muted); margin-bottom:0.5rem; font-family:var(--font-mono);">SECURE_ACCESS_KEY</div>
            <div class="pckey" id="provisionAccessKey">${esc(res.accessKey)}</div>
            ${vDays ? `<div style="font-size:0.6rem; color:var(--tx-muted); margin-top:0.75rem; font-family:var(--font-mono);">DURATION: ${vDays}D - TIER: ${selectedTier.toUpperCase()}</div>` : ''}
          </div>
        `;
        toggleActionSheet(false);
        document.getElementById('vendorSuccessOverlay').classList.add('active');
        if(window.GamingEffects) {
            window.GamingEffects.createParticles(btn, 25, 'gold');
            window.GamingEffects.showSuccess('Vendor Node Provisioned!');
        }
        loadDashboard();
      } catch(e) {
        if (window.notify) window.notify(e.message, 'error');
        if(window.GamingEffects) window.GamingEffects.showError('Provisioning Failed');
      } finally {
        btn.textContent = 'INITIALIZE_NODE_PROVISION'; btn.disabled = false;
      }
    }

    function copyProvisionedKey() {
      const key = document.getElementById('provisionAccessKey')?.textContent;
      if (key) navigator.clipboard.writeText(key);
      if (window.notify) window.notify('KEY_COPIED', 'success');
    }

    function closeSuccessOverlay() {
      document.getElementById('vendorSuccessOverlay').classList.remove('active');
    }

    async function downloadProvisionedCard() {
      const el = document.getElementById('cardToCapture');
      try {
        const canvas = await html2canvas(el, { backgroundColor: '#0d0a00', useCORS: true, scale: 2.5 });
        const a = document.createElement('a');
        a.download = `AXP_NODE_${Date.now()}.png`;
        a.href = canvas.toDataURL();
        a.click();
      } catch(e) { if (window.notify) window.notify('DOWNLOAD_ERR: ' + e.message, 'error'); }
    }

    async function toggleStatus(vid, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      try {
        await api('/api/vault/admin/vendor/status', 'POST', { vendorId: vid, status: newStatus });
        if (window.notify) window.notify(`${vid} -> ${newStatus.toUpperCase()}`, 'success');
        loadDashboard();
      } catch(e) { if (window.notify) window.notify('STATUS_ERR: ' + e.message, 'error'); }
    }

    async function deleteVendor(vid) {
      const confirmed = confirm('ERASE NODE FROM REGISTRY?\n\nThis action cannot be undone.');
      if (!confirmed) return;
      try {
        await api(`/api/vault/admin/vendors/${encodeURIComponent(vid)}`, 'DELETE');
        if (window.notify) window.notify(`${vid} ERASED`, 'success');
        loadDashboard();
      } catch(e) { if (window.notify) window.notify('ERASE_ERR: ' + e.message, 'error'); }
    }

    async function downloadExistingVendorCard(vid, tier, daysLeft) {
      const tierColor = { gold: '#f59e0b', premium: '#a855f7', normal: '#00e5ff' };
      const color = tierColor[tier] || '#00e5ff';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `position:fixed;top:-9999px;left:-9999px;z-index:-1;background:#0a1128;padding:32px;border-radius:24px;border:1px solid ${color}44;width:360px;font-family:monospace;`;
      wrapper.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:0.6rem;font-weight:900;color:${color};letter-spacing:0.15em;margin-bottom:8px;">AXP_NEURAL_NEXUS</div>
          <div style="font-size:1.6rem;font-weight:900;color:#fff;margin-bottom:4px;">${vid.toUpperCase()}</div>
          <div style="font-size:0.7rem;color:${color};font-weight:800;margin-bottom:24px;">${tier.toUpperCase()}_NODE</div>
          <div style="display:flex;justify-content:center;gap:24px;">
            <div><div style="font-size:0.5rem;color:#9ca3af;">EXPIRES</div><div style="font-size:1rem;font-weight:900;color:#fff;">${daysLeft}D</div></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrapper);
      try {
        const canvas = await html2canvas(wrapper, { backgroundColor: '#0a1128', useCORS: true, scale: 2.5 });
        const a = document.createElement('a'); a.download = `AXP_ID_${vid}_${Date.now()}.png`; a.href = canvas.toDataURL(); a.click();
      } catch(e) { if (window.notify) window.notify('CARD_ERR', 'error'); }
      document.body.removeChild(wrapper);
    }

    /* --- Vendor Logs Modal --- */
    async function showAnalytics(vid, codes, usage) {
      document.getElementById('modalTitle').textContent = `LOGS_${vid.toUpperCase()}`;
      document.getElementById('vCodes').textContent = codes;
      document.getElementById('vUsage').textContent = usage;
      document.getElementById('analyticsModal').classList.add('active');
      const body = document.getElementById('activityBody');
      body.innerHTML = '<div class="text-center py-4 opacity-40 text-xs font-mono">FETCHING_REGISTRY_LOGS...</div>';
      try {
        const logs = await api(`/api/vault/admin/vendor/${encodeURIComponent(vid)}/analytics`);
        if (!logs?.length) { body.innerHTML = '<div class="text-center py-4 opacity-20 text-xs font-mono">EMPTY_BUFFER</div>'; return; }
        body.innerHTML = logs.map(l => `
          <div class="flex justify-between text-xs py-2" style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:var(--tx-hero); font-family:var(--font-mono);">${esc(l.user_ign || 'ANON')}</span>
            <span style="color:var(--tx-muted);">${esc(l.user_region || 'GLB')} - ${new Date(l.used_at).toLocaleDateString()}</span>
          </div>
        `).join('');
      } catch(_) { body.innerHTML = '<div class="text-center py-4 text-error text-xs font-mono">LOG_READ_ERR</div>'; }
    }

    function closeModal() { document.getElementById('analyticsModal').classList.remove('active'); }

    /* --- Master Key Update --- */
    async function updateMasterKey() {
      const key = document.getElementById('newMasterKey').value.trim();
      if (!key) return;
      if (!confirm('Update admin master phrase? You will be logged out immediately.')) return;
      try {
        await api('/api/vault/admin/update-master-key', 'POST', { newKey: key });
        if (window.GamingEffects) window.GamingEffects.showSuccess('MASTER_KEY_SYNCED');
        setTimeout(logoutAdmin, 1000);
      } catch(e) { 
        if (window.notify) window.notify('KEY_SYNC_ERR: ' + e.message, 'error');
      }
    }

    /* --- Global Key Lookup --- */
    async function lookupGlobalKey() {
      const key = document.getElementById('globalKeySearch').value.trim();
      if (!key) return;
      const resDiv = document.getElementById('globalKeyResult');
      resDiv.classList.remove('hidden');
      resDiv.innerHTML = '<div class="py-2 text-center opacity-50 text-xs font-mono">SCANNING...</div>';
      try {
        const data = await api(`/api/vault/admin/lookup/${encodeURIComponent(key)}`);
        resDiv.innerHTML = `
          <div style="padding: 0.75rem; font-family: var(--font-mono);">
            <div style="color: var(--gold); font-weight: 900; margin-bottom: 6px;">KEY_FOUND: ${esc(data.lookup_key || key)}</div>
            <div style="color: var(--tx-hero); font-size: 0.6rem; margin-bottom: 3px;">VENDOR: ${esc(data.vendor_id)}</div>
            <div style="color: var(--tx-muted); font-size: 0.6rem; margin-bottom: 3px;">CREATED: ${data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A'}</div>
            <div style="color: var(--tx-muted); font-size: 0.6rem;">STATUS: ${esc((data.status || 'unknown').toUpperCase())}</div>
          </div>
        `;
      } catch(e) {
        resDiv.innerHTML = '<div class="py-2 text-center text-error text-xs font-mono">KEY_NOT_FOUND_IN_REGISTRY</div>';
      }
    }

    function initToolDevices() {
      if (!window.DeviceRegistry) {
        setTimeout(initToolDevices, 300);
        return;
      }
      window.DeviceRegistry.initSelection('toolBrand', 'toolSeries', 'toolModel');
      
      const modelSel = document.getElementById('toolModel');
      const ramSel   = document.getElementById('toolRam');
      if (modelSel && ramSel) {
        modelSel.addEventListener('change', () => {
          const opt = modelSel.options[modelSel.selectedIndex];
          const ram = opt?.getAttribute('data-ram');
          if (ram) ramSel.value = ram;
        });
      }
    }

    /* --- Tool Computation --- */
    function computeAdminTool() {
      const model = document.getElementById('toolModel').value;
      const brand = document.getElementById('toolBrand').value;
      const ram   = parseInt(document.getElementById('toolRam').value) || 8;
      const speed = document.getElementById('toolSpeed').value;
      const scale = parseFloat(document.getElementById('toolScale').value) || 5;
      if (!model) { if (window.notify) window.notify('SELECT_A_MODEL_FIRST', 'error'); return; }

      const ramFactor = Math.min(1, ram / 12);
      const speedMap  = { slow: 0.85, balanced: 1.0, fast: 1.15 };
      const base      = 85 + (ramFactor * 8);
      const mult      = speedMap[speed] || 1.0;
      const neural    = (scale / 10);

      const genSens    = Math.round(base * mult * neural * 10) / 10;
      const redDot     = Math.round(genSens * 0.88 * 10) / 10;
      const scope2     = Math.round(genSens * 0.72 * 10) / 10;
      const scope4     = Math.round(genSens * 0.60 * 10) / 10;
      const freeLook   = Math.round(genSens * 1.15 * 10) / 10;

      const res = document.getElementById('adminToolResult');
      res.classList.remove('hidden');
      document.getElementById('adminCardCapture').innerHTML = `
        <div class="card" style="border-color: var(--cyan); text-align: center; padding: 1.5rem;">
          <div class="badge-cyan mb-2">MASTER_DECRYPTION_SUCCESS</div>
          <div style="font-size: 0.7rem; color: var(--tx-muted); font-family: var(--font-mono); margin-bottom: 0.25rem;">${brand.toUpperCase()}</div>
          <div style="font-size: 1.2rem; font-weight: 900; color: #fff; margin-bottom: 1rem;">${model.toUpperCase()}</div>
          <div class="stat-grid-2" style="gap: 0.5rem; margin-bottom: 0.5rem;">
            <div class="stat-tile"><span class="stat-tile-label">GENERAL</span><span class="stat-tile-val" style="color:var(--cyan);">${genSens}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">RED_DOT</span><span class="stat-tile-val" style="color:var(--cyan);">${redDot}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">2x_SCOPE</span><span class="stat-tile-val" style="color:var(--cyan);">${scope2}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">4x_SCOPE</span><span class="stat-tile-val" style="color:var(--cyan);">${scope4}</span></div>
          </div>
          <div class="stat-tile" style="margin-bottom: 0.5rem;"><span class="stat-tile-label">FREE_LOOK</span><span class="stat-tile-val" style="color:var(--cyan);">${freeLook}</span></div>
          <div class="text-muted font-mono" style="font-size: 0.55rem;">RAM: ${ram}GB - SCALE: ${scale}/10 - ${speed.toUpperCase()} - AXP_MASTER</div>
        </div>
      `;
    }

    async function downloadAdminCard() {
      const el = document.getElementById('adminCardCapture');
      try {
        const canvas = await html2canvas(el, {
          backgroundColor: '#020617', useCORS: true, scale: 2.5,
          onclone: d => { d.getElementById('adminCardCapture').style.padding = '32px'; }
        });
        const a = document.createElement('a'); a.download = `AXP_MASTER_${Date.now()}.png`; a.href = canvas.toDataURL(); a.click();
      } catch(e) { if (window.notify) window.notify('DOWNLOAD_ERR', 'error'); }
    }

    function copyAdminResults() {
      const model = document.getElementById('toolModel').value || 'DEVICE';
      navigator.clipboard.writeText(`AXP MASTER CALIBRATION: ${model} - Generated by AXP Neural Nexus`);
      if (window.notify) window.notify('COPIED_TO_CLIPBOARD', 'success');
    }
anced: 1.0, fast: 1.15 };
      const base      = 85 + (ramFactor * 8);
      const mult      = speedMap[speed] || 1.0;
      const neural    = (scale / 10);

      const genSens    = Math.round(base * mult * neural * 10) / 10;
      const redDot     = Math.round(genSens * 0.88 * 10) / 10;
      const scope2     = Math.round(genSens * 0.72 * 10) / 10;
      const scope4     = Math.round(genSens * 0.60 * 10) / 10;
      const freeLook   = Math.round(genSens * 1.15 * 10) / 10;

      const res = document.getElementById('adminToolResult');
      res.classList.remove('hidden');
      document.getElementById('adminCardCapture').innerHTML = `
        <div class="card" style="border-color: var(--cyan); text-align: center; padding: 1.5rem;">
          <div class="badge-cyan mb-2">MASTER_DECRYPTION_SUCCESS</div>
          <div style="font-size: 0.7rem; color: var(--tx-muted); font-family: var(--font-mono); margin-bottom: 0.25rem;">${brand.toUpperCase()}</div>
          <div style="font-size: 1.2rem; font-weight: 900; color: #fff; margin-bottom: 1rem;">${model.toUpperCase()}</div>
          <div class="stat-grid-2" style="gap: 0.5rem; margin-bottom: 0.5rem;">
            <div class="stat-tile"><span class="stat-tile-label">GENERAL</span><span class="stat-tile-val" style="color:var(--cyan);">${genSens}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">RED_DOT</span><span class="stat-tile-val" style="color:var(--cyan);">${redDot}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">2x_SCOPE</span><span class="stat-tile-val" style="color:var(--cyan);">${scope2}</span></div>
            <div class="stat-tile"><span class="stat-tile-label">4x_SCOPE</span><span class="stat-tile-val" style="color:var(--cyan);">${scope4}</span></div>
          </div>
          <div class="stat-tile" style="margin-bottom: 0.5rem;"><span class="stat-tile-label">FREE_LOOK</span><span class="stat-tile-val" style="color:var(--cyan);">${freeLook}</span></div>
          <div class="text-muted font-mono" style="font-size: 0.55rem;">RAM: ${ram}GB - SCALE: ${scale}/10 - ${speed.toUpperCase()} - AXP_MASTER</div>
        </div>
      `;
    }
