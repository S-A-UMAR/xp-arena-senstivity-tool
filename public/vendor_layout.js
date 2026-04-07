const VendorUI = {
    init() {
        const token = localStorage.getItem('axp_vendor_token') || this.getCookie('xp_vendor_token');
        if (!token) return;

        this.renderNav();
        this.renderQuickActions();
    },

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    },

    renderNav() {
        const navContainer = document.createElement('div');
        navContainer.className = 'vendor-nav-container';
        
        const pathParts = window.location.pathname.split('/');
        const currentPage = pathParts[pathParts.length - 1] || 'vendor_dashboard.html';

        navContainer.innerHTML = `
            <div class="floating-settings" onclick="window.location.href='vendor_settings.html'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <nav class="vendor-nav-bar">
                <a href="vendor_data.html" class="nav-item ${currentPage === 'vendor_data.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    <span class="nav-label">DATA</span>
                </a>
                <a href="vendor_dashboard.html" class="nav-item ${currentPage === 'vendor_dashboard.html' || currentPage === '' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    <span class="nav-label">HOME</span>
                </a>
                <a href="vendor_stats.html" class="nav-item ${currentPage === 'vendor_stats.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    <span class="nav-label">STATS</span>
                </a>
                <div class="fab-wrapper">
                    <button class="fab-btn" onclick="VendorLogic.createEvent('scrim')">+</button>
                </div>
                <a href="vendor_gifts.html" class="nav-item ${currentPage === 'vendor_gifts.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.41 12.25 12 8.66l3.59 3.59L17 10.83 14.92 8H20v6z"/></svg>
                    <span class="nav-label">GIFT</span>
                </a>
                <a href="vendor_scrims.html" class="nav-item ${currentPage === 'vendor_scrims.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 10.63 21 8.55 21 8V7c0-1.1-.9-2-2-2zM7 10.82C5.84 10.4 5 9.3 5 8V7h2v3.82zM19 8c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
                    <span class="nav-label">SCRIM</span>
                </a>
                <a href="vendor_settings.html" class="nav-item ${currentPage === 'vendor_settings.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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
