// ═══════════════════════════════════════════════════════════════
//  AXP ADMIN CORE — Shared Logic for Multi-page Dashboard
// ═══════════════════════════════════════════════════════════════

const ADMIN_TOKEN_KEY = 'axp_admin_token';

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch(url, options = {}) {
  const { autoRedirect401 = true, ...fetchOptions } = options;
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include'
    });
    
    if (autoRedirect401 && res.status === 401) {
      clearAdminToken();
      // Only redirect if we are not already on the login page
      if (!window.location.pathname.endsWith('/admin/index.html') && !window.location.pathname.endsWith('/admin/')) {
        window.location.href = '/admin/index.html?reason=session_expired';
      }
      throw new Error('ADMIN_SESSION_REQUIRED');
    }
    return res;
  } catch (err) {
    if (err.message === 'ADMIN_SESSION_REQUIRED') throw err;
    console.error('FETCH_ERR:', err);
    throw err;
  }
}

async function api(path, method = 'GET', body = null) {
  const res = await adminFetch(path, {
    method,
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `API_ERR_${res.status}`);
  return data;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── UI Notifications ─────────────────────────────────────────────
function adminNotify(message, type = 'success') {
  const popup = document.createElement('div');
  const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b';
  popup.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px);
    background: rgba(10, 15, 30, 0.95); backdrop-filter: blur(10px);
    border: 1px solid ${color}; border-radius: 8px;
    padding: 12px 24px; color: #fff; font-family: var(--font-mono, monospace); font-size: 0.75rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${color}33;
    z-index: 10000; opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex; align-items: center; gap: 12px;
  `;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  popup.innerHTML = `<span style="color: ${color}; font-weight: bold; font-size: 1rem;">${icon}</span> <span>${message}</span>`;
  
  document.body.appendChild(popup);
  
  requestAnimationFrame(() => {
    popup.style.transform = 'translateX(-50%) translateY(0)';
    popup.style.opacity = '1';
  });
  
  setTimeout(() => {
    popup.style.transform = 'translateX(-50%) translateY(-20px)';
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}

function adminConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
      z-index: 10000; display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    `;
    
    const box = document.createElement('div');
    box.style.cssText = `
      background: #0f172a; border: 1px solid var(--gold); border-radius: 12px;
      padding: 24px; max-width: 90%; width: 340px; text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6); transform: scale(0.95); transition: transform 0.2s;
    `;
    
    box.innerHTML = `
      <div style="color: var(--error); margin-bottom: 16px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto;">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div style="font-family: var(--font-mono, monospace); font-size: 0.8rem; color: #fff; margin-bottom: 24px; line-height: 1.5; letter-spacing: 0.05em;">${message}</div>
      <div style="display: flex; gap: 12px;">
        <button id="btnCancel" class="btn-ghost auto" style="flex: 1; padding: 0.8rem; font-size: 0.7rem;">CANCEL</button>
        <button id="btnConfirm" class="btn-cta gold" style="flex: 1; background: var(--error); border-color: var(--error); color: #fff; padding: 0.8rem; font-size: 0.7rem;">CONFIRM</button>
      </div>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      box.style.transform = 'scale(1)';
    });
    
    const close = (result) => {
      overlay.style.opacity = '0';
      box.style.transform = 'scale(0.95)';
      setTimeout(() => { overlay.remove(); resolve(result); }, 200);
    };
    
    box.querySelector('#btnCancel').onclick = () => close(false);
    box.querySelector('#btnConfirm').onclick = () => close(true);
  });
}

// ── Navigation ──────────────────────────────────────────────────
function renderAdminNav(activeTab) {
  const nav = document.createElement('nav');
  nav.className = 'admin-nav';
  
  const items = [
    { id: 'dashboard', label: 'CORE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { id: 'nodes', label: 'NODES', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { id: 'tool', label: 'TOOL', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id: 'security', label: 'SAFE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'settings', label: 'SETUP', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>' }
  ];

  nav.innerHTML = items.map(item => `
    <a href="/admin/${item.id}.html" class="anav-item ${activeTab === item.id ? 'active' : ''}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');

  // Add the floating action button if on nodes page
  if (activeTab === 'nodes') {
    const fab = document.createElement('div');
    fab.className = 'fab-slot';
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    fab.onclick = () => typeof toggleActionSheet === 'function' && toggleActionSheet(true);
    nav.insertBefore(fab, nav.children[2]);
  }

  document.body.appendChild(nav);
}

function renderAdminHeader(title) {
  const header = document.createElement('header');
  header.className = 'page-header';
  header.innerHTML = `
    <div class="ph-logo" style="color: var(--gold);">AXP_MASTER</div>
    <div class="ph-title">${title}</div>
    <button class="btn-ghost auto" style="font-size: 0.6rem; color: var(--error);" onclick="logoutAdmin()">DISCONNECT</button>
  `;
  document.body.prepend(header);
}

async function logoutAdmin() {
  try { await adminFetch('/api/vault/admin/logout', { method: 'POST' }); } catch(_) {}
  clearAdminToken();
  window.location.href = '/admin/index.html?logout=true';
}

async function checkSession() {
  try {
    const probe = await adminFetch('/api/vault/admin/stats', { autoRedirect401: false });
    if (!probe.ok) throw new Error('SESSION_INVALID');
    return true;
  } catch (err) {
    if (!window.location.pathname.endsWith('/admin/index.html') && !window.location.pathname.endsWith('/admin/')) {
        window.location.href = '/admin/index.html?reason=required';
    }
    return false;
  }
}
