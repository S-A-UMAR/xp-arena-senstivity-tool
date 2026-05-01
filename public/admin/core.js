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

// ── Navigation ──────────────────────────────────────────────────
function renderAdminNav(activeTab) {
  const nav = document.createElement('nav');
  nav.className = 'admin-nav';
  
  const items = [
    { id: 'dashboard', label: 'CORE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { id: 'nodes', label: 'NODES', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { id: 'tool', label: 'TOOL', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id: 'security', label: 'SAFE', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'settings', label: 'SETUP', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' }
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
