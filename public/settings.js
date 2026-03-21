(function() {
    const themes = {
        cyan: { primary: '#00f0ff', glow: 'rgba(0, 240, 255, 0.3)' },
        green: { primary: '#00ff88', glow: 'rgba(0, 255, 136, 0.3)' },
        purple: { primary: '#bf00ff', glow: 'rgba(191, 0, 255, 0.3)' },
        orange: { primary: '#ffaa00', glow: 'rgba(255, 170, 0, 0.3)' },
        red: { primary: '#ff4444', glow: 'rgba(255, 68, 68, 0.3)' }
    };

    const langs = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'pt', name: 'Português', flag: '🇧🇷' },
        { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }
    ];

    function applyTheme(themeKey) {
        const theme = themes[themeKey] || themes.cyan;
        document.documentElement.style.setProperty('--accent-primary', theme.primary);
        document.documentElement.style.setProperty('--accent-primary-glow', theme.glow);
        localStorage.setItem('xp_preferred_theme', themeKey);
        
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === themeKey);
        });
    }



    function closeActivePanels() {
        let closed = false;
        if (typeof window.toggleSheet === 'function') {
            window.toggleSheet(false);
            closed = true;
        }
        if (typeof window.toggleActionSheet === 'function') {
            window.toggleActionSheet(false);
            closed = true;
        }
        if (typeof window.closeSuccessOverlay === 'function') {
            window.closeSuccessOverlay();
            closed = true;
        }
        if (typeof window.closeModal === 'function') {
            window.closeModal();
            closed = true;
        }
        document.querySelectorAll('.sheet-overlay.active, .action-sheet.active, .modal.active, .success-overlay.active, .hub-panel:not(.hidden)').forEach((node) => {
            if (node.classList.contains('hub-panel')) {
                node.classList.add('hidden');
                document.getElementById('hub-trigger')?.classList.remove('active');
            } else {
                node.classList.remove('active');
            }
            closed = true;
        });
        return closed;
    }

    function getBackTarget() {
        const pathName = window.location.pathname.split('/').pop() || 'index.html';
        if (pathName === 'result.html') {
            return sessionStorage.getItem('xp_nav_origin') === 'vendor_dashboard.html' ? '/vendor_dashboard.html' : '/verify.html';
        }
        if (pathName === 'verify.html') return '/index.html';
        if (pathName === 'admin.html') return '/verify.html';
        return null;
    }

    function shouldShowBackButton() {
        const pathName = window.location.pathname.split('/').pop() || 'index.html';
        return ['result.html', 'verify.html', 'admin.html'].includes(pathName);
    }

    function applyLang(langCode) {
        localStorage.setItem('xp_lang', langCode);
        document.querySelectorAll('.lang-item').forEach(item => {
            item.classList.toggle('active', item.dataset.lang === langCode);
        });
        if (window.UI && typeof window.UI.applyLang === 'function') {
            window.UI.applyLang();
        }
        window.dispatchEvent(new CustomEvent('xp:language-change', { detail: { lang: langCode } }));
    }

    // Inject Settings Hub UI
    const hub = document.createElement('div');
    hub.id = 'settings-hub';
    hub.innerHTML = `
        <div class="hub-trigger" id="hub-trigger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div class="hub-panel shadow-premium hidden" id="hub-panel">
            <div class="hub-section">
                <label>ACCENT_COLOR</label>
                <div class="theme-list">
                    ${Object.keys(themes).map(t => `
                        <div class="theme-dot" data-theme="${t}" style="background: ${themes[t].primary}"></div>
                    `).join('')}
                </div>
            </div>
            <div class="hub-section">
                <label>SYSTEM_LANGUAGE</label>
                <div class="lang-list">
                    ${langs.map(l => `
                        <div class="lang-item ${localStorage.getItem('xp_lang') === l.code ? 'active' : ''}" data-lang="${l.code}">
                            <span class="flag">${l.flag}</span>
                            <span class="name">${l.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #settings-hub {
            position: fixed;
            bottom: 100px;
            right: 1.5rem;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 1rem;
            font-family: 'Inter', sans-serif;
        }
        .hub-trigger {
            width: 42px;
            height: 42px;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid var(--accent-primary);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary);
            cursor: pointer;
            box-shadow: 0 0 15px var(--accent-primary-glow);
            transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .hub-trigger svg { width: 22px; height: 22px; transition: 0.6s; }
        .hub-trigger:hover { transform: scale(1.1); }
        .hub-trigger.active svg { transform: rotate(90deg); }
        
        .hub-panel {
            width: 240px;
            background: rgba(2, 6, 23, 0.95);
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 1.2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            transition: 0.3s;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .hub-panel.hidden {
            transform: translateY(20px);
            opacity: 0;
            visibility: hidden;
        }
        
        .hub-section label {
            display: block;
            font-size: 0.65rem;
            font-weight: 800;
            color: var(--text-muted);
            letter-spacing: 0.15em;
            margin-bottom: 0.75rem;
            text-transform: uppercase;
        }
        
        .theme-list { display: flex; gap: 0.7rem; justify-content: center; }
        .theme-dot {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            cursor: pointer;
            transition: 0.2s;
            border: 2px solid transparent;
        }
        .theme-dot.active { border-color: white; box-shadow: 0 0 15px currentColor; }
        
        .lang-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4px;
            max-height: 200px;
            overflow-y: auto;
            padding-right: 5px;
        }
        .lang-list::-webkit-scrollbar { width: 4px; }
        .lang-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        
        .lang-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: 0.2s;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .lang-item:hover { background: rgba(255,255,255,0.05); color: white; }
        .lang-item.active { background: var(--accent-primary-glow); color: var(--accent-primary); font-weight: 700; }

        .lang-item .flag { font-size: 1.1rem; }

        #xp-nav-hub {
            position: fixed;
            top: max(1rem, env(safe-area-inset-top, 0px) + 0.5rem);
            left: 1rem;
            z-index: 10001;
            display: flex;
            gap: 0.65rem;
        }
        .xp-nav-btn {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(6, 12, 18, 0.84);
            backdrop-filter: blur(14px);
            color: #f3f8ff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 14px 30px rgba(0,0,0,0.22);
            cursor: pointer;
        }
        .xp-nav-btn.hidden { display: none; }
        .xp-nav-btn svg { width: 20px; height: 20px; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(hub);

    // Initial State
    const savedTheme = localStorage.getItem('xp_preferred_theme') || 'cyan';
    applyTheme(savedTheme);

    // Trigger Logic
    const trigger = document.getElementById('hub-trigger');
    const panel = document.getElementById('hub-panel');
    
    trigger.addEventListener('click', () => {
        trigger.classList.toggle('active');
        panel.classList.toggle('hidden');
    });

    // Theme Logic
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
    });

    // Language Logic
    document.querySelectorAll('.lang-item').forEach(item => {
        item.addEventListener('click', () => applyLang(item.dataset.lang));
    });



    // App navigation helper
    const navHub = document.createElement('div');
    navHub.id = 'xp-nav-hub';
    navHub.innerHTML = `
        <button class="xp-nav-btn hidden" id="xpBackBtn" type="button" aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/><path d="M21 12H9"/></svg>
        </button>
        <button class="xp-nav-btn hidden" id="xpCloseBtn" type="button" aria-label="Close panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
        </button>
    `;
    document.body.appendChild(navHub);

    const backBtn = document.getElementById('xpBackBtn');
    const closeBtn = document.getElementById('xpCloseBtn');

    function syncNavButtons() {
        const closable = document.querySelector('.sheet-overlay.active, .action-sheet.active, .modal.active, .success-overlay.active, .hub-panel:not(.hidden)');
        closeBtn.classList.toggle('hidden', !closable);
        backBtn.classList.toggle('hidden', closable || !shouldShowBackButton());
    }

    backBtn?.addEventListener('click', () => {
        const target = getBackTarget();
        if (window.history.length > 1 && !target) {
            window.history.back();
            return;
        }
        if (target) {
            window.location.href = target;
        }
    });

    closeBtn?.addEventListener('click', () => {
        closeActivePanels();
        syncNavButtons();
    });

    document.addEventListener('click', () => {
        window.requestAnimationFrame(syncNavButtons);
    });
    window.addEventListener('DOMContentLoaded', syncNavButtons);
    window.addEventListener('keyup', (event) => {
        if (event.key === 'Escape' && closeActivePanels()) {
            syncNavButtons();
        }
    });

    // Global Overrides
    window.addEventListener('DOMContentLoaded', () => {
        applyTheme(localStorage.getItem('xp_preferred_theme') || 'cyan');
    });
})();
