const VendorUI = {
    init() {
        // More robust page detection for local development
        const path = window.location.pathname;
        const isVendorPage = path.includes('vendor_') || path.includes('dashboard') || path.includes('gifts') || path.includes('scrims') || path.includes('stats') || path.includes('winners.html') || path.includes('events.html');
        
        if (isVendorPage) {
            this.renderNav();
        } else {
            // Check token for public pages to show FAB
            const token = localStorage.getItem('axp_vendor_token') || this.getCookie('xp_vendor_token');
            if (token) {
                this.renderPublicVendorFAB();
            }
        }
        
        this.renderQuickActions();
    },

    renderPublicVendorFAB() {
        const fab = document.createElement('div');
        fab.innerHTML = `<button class="fab-btn" style="position:fixed; bottom:100px; right:20px; z-index:5000; width:60px; height:60px; font-size:24px; border:4px solid var(--bg-deep);" onclick="VendorUI.toggleQuickActions(true)">+</button>`;
        document.body.appendChild(fab);
    },

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    },

    renderNav() {
        const navContainer = document.createElement('div');
        navContainer.className = 'vendor-nav-container';
        
        const path = window.location.pathname;
        const getActive = (name) => path.includes(name) ? 'active' : '';

        navContainer.innerHTML = `
            <nav class="vendor-nav-bar">
                <a href="vendor_data.html" class="nav-item ${getActive('data')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                    <span class="nav-label">DATA</span>
                </a>
                <a href="vendor_dashboard.html" class="nav-item ${getActive('dashboard')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span class="nav-label">HOME</span>
                </a>
                <a href="vendor_stats.html" class="nav-item ${getActive('stats')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16V12"/><path d="M15 16V10"/><path d="M19 16V4"/></svg>
                    <span class="nav-label">STATS</span>
                </a>
                <div class="fab-wrapper">
                    <button class="fab-btn" onclick="VendorUI.toggleQuickActions(true)">+</button>
                </div>
                <a href="vendor_gifts.html" class="nav-item ${getActive('gifts')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5H12z"/></svg>
                    <span class="nav-label">GIFT</span>
                </a>
                <a href="vendor_scrims.html" class="nav-item ${getActive('scrims')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    <span class="nav-label">SCRIM</span>
                </a>
                <a href="vendor_settings.html" class="nav-item ${getActive('settings')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span class="nav-label">ELITE</span>
                </a>
            </nav>
        `;
        document.body.appendChild(navContainer);
    },

    renderQuickActions() {
        const overlay = document.createElement('div');
        overlay.id = 'quickActionOverlay';
        overlay.className = 'quick-action-overlay';
        overlay.innerHTML = `
            <div class="quick-grid">
                <div class="quick-item" onclick="VendorUI.toggleQuickActions(false); window.location.href='vendor_dashboard.html'">
                    <span class="quick-icon">⚡</span>
                    <span class="quick-label">NEW CODE</span>
                </div>
                <div class="quick-item" onclick="VendorUI.toggleQuickActions(false); VendorLogic.createEvent('giveaway')">
                    <span class="quick-icon">🎁</span>
                    <span class="quick-label">NEW GIFT</span>
                </div>
                <div class="quick-item" onclick="VendorUI.toggleQuickActions(false); VendorLogic.createEvent('scrim')">
                    <span class="quick-icon">🏆</span>
                    <span class="quick-label">NEW SCRIM</span>
                </div>
                <div class="quick-item" onclick="VendorUI.toggleQuickActions(false); window.location.href='vendor_data.html?action=export'">
                    <span class="quick-icon">📊</span>
                    <span class="quick-label">EXPORT DATA</span>
                </div>
            </div>
            <div class="close-quick" onclick="VendorUI.toggleQuickActions(false)">×</div>
        `;
        document.body.appendChild(overlay);
    },

    toggleQuickActions(show) {
        const overlay = document.getElementById('quickActionOverlay');
        if (show) overlay.classList.add('active');
        else overlay.classList.remove('active');
    },

    setActiveNav() {
        // Handled in renderNav for simple page-based routing
    }
};

document.addEventListener('DOMContentLoaded', () => VendorUI.init());
