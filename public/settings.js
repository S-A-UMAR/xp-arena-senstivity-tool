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
    const STORAGE_KEYS = {
        theme: 'xp_preferred_theme',
        lang: 'xp_lang',
        reduceMotion: 'xp_reduce_motion',
        highContrast: 'xp_high_contrast',
        largeText: 'xp_large_text',
        compactMode: 'xp_compact_mode'
    };
    const SAFE_HTML_TRANSLATION_KEYS = new Set(['heroTitle']);
    const preferenceToggles = [
        { id: 'reduce-motion-toggle', key: STORAGE_KEYS.reduceMotion, label: 'reduceMotion', attr: 'reduceMotion' },
        { id: 'contrast-toggle', key: STORAGE_KEYS.highContrast, label: 'highContrast', attr: 'highContrast' },
        { id: 'large-text-toggle', key: STORAGE_KEYS.largeText, label: 'largeText', attr: 'largeText' },
        { id: 'compact-mode-toggle', key: STORAGE_KEYS.compactMode, label: 'compactMode', attr: 'compactMode' }
    ];

    function getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function syncActiveItems(selector, dataKey, activeValue) {
        document.querySelectorAll(selector).forEach((node) => {
            node.classList.toggle('active', node.dataset[dataKey] === activeValue);
        });
    }

    function bindDatasetClicks(selector, dataKey, handler) {
        document.querySelectorAll(selector).forEach((node) => {
            node.addEventListener('click', () => handler(node.dataset[dataKey]));
        });
    }

    function getDictionary(langCode) {
        const fallback = (window.LANGUAGES && window.LANGUAGES.en) || {};
        return { ...fallback, ...((window.LANGUAGES && window.LANGUAGES[langCode]) || {}) };
    }

    function translateValue(key, langCode, fallback = '') {
        const dict = getDictionary(langCode || localStorage.getItem(STORAGE_KEYS.lang) || 'en');
        return dict[key] || fallback || key;
    }

    const selectorTranslationMap = {
        'index.html': [
            ['.hero-headline', 'heroTitle', 'html'],
            ['.hero-sub', 'heroSubtitleFull'],
            ['#vaultOverlay h1', 'vaultTitle'],
            ['#vaultInput', 'vaultPlaceholder', 'placeholder'],
            ['#vaultAuthBtn', 'openPortal'],
            ['#vaultStatus', 'secureAccessOnly'],
            ['.vault-helper:nth-of-type(1) strong', 'authorized'],
            ['.vault-helper:nth-of-type(2) strong', 'creators'],
            ['.vault-helper:nth-of-type(3) strong', 'players'],
            ['.vault-helper:nth-of-type(1) span', 'authorizedHint'],
            ['.vault-helper:nth-of-type(2) span', 'creatorsHint'],
            ['.vault-helper:nth-of-type(3) span', 'playersHint'],
            ['label[for="brandSelect"], .form-label[data-i18n="brandLabel"]', 'hardwareSignature'],
            ['label[data-i18n="title"]', 'neuralSensitivityLabel'],
            ['label[data-i18n="clawLabel"]', 'gripArchitecture'],
            ['#brandSelect option[value=""]', 'selectBrand'],
            ['#seriesSelect option[value=""]', 'selectSeries'],
            ['#modelSelect option[value=""]', 'selectModel'],
            ['#manualMastering .form-label', 'manualExistingBase'],
            ['#manualSens', 'manualPlaceholder', 'placeholder'],
            ['#standardMastering button', 'manualModeOn'],
            ['#standardMastering p', 'manualModeHint'],
            ['#manualMastering button', 'manualModeOff'],
            ['#manualMastering p', 'manualHelp'],
            ['#calculateBtn', 'generateGuide'],
            ['#perfBtn', 'fullNeuralMode'],
            ['footer a:nth-of-type(1)', 'privacy'],
            ['footer a:nth-of-type(2)', 'terms'],
            ['footer a:nth-of-type(3)', 'support'],
            ['.premium-footer-note p', 'poweredBy']
        ],
        'verify.html': [
            ['#guidanceBox .stat-label', 'verificationGuide'],
            ['.terminal-content .action-btn', 'returnToGateway']
        ],
        'result.html': [
            ['.hero-banner p', 'resultHeroText'],
            ['.device-access-header', 'deviceAccess'],
            ['#followBtn', 'followCreator']
        ]
    };

    const autoTranslateSelectors = 'button, label, h1, h2, h3, h4, p, span, a, small, option';

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function canRenderHtml(key, mode, value) {
        return mode === 'html' && SAFE_HTML_TRANSLATION_KEYS.has(key) && /<br\s*\/?>/i.test(value);
    }

    function translateElement(el, key, langCode, fallback, mode) {
        const value = translateValue(key, langCode, fallback);
        if (mode === 'placeholder') {
            el.setAttribute('placeholder', value);
            return;
        }
        if (canRenderHtml(key, mode, value)) {
            el.innerHTML = value;
            return;
        }
        el.textContent = normalizeText(value);
    }

    function primeAutoTranslationKeys() {
        const reverseMap = Object.entries(getDictionary('en')).reduce((acc, [key, value]) => {
            const normalized = normalizeText(value).replace(/<br\s*\/?/gi, ' ').replace(/>/g, '');
            if (normalized) acc[normalized] = key;
            return acc;
        }, {});

        document.querySelectorAll(autoTranslateSelectors).forEach((el) => {
            if (el.dataset.i18n || el.dataset.i18nAuto) return;
            if (el.children.length > 0) return;
            const current = normalizeText(el.textContent);
            const matchedKey = reverseMap[current];
            if (matchedKey) el.dataset.i18nAuto = matchedKey;
        });

        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
            if (el.dataset.i18nPlaceholder) return;
            const current = normalizeText(el.getAttribute('placeholder'));
            const matchedKey = reverseMap[current];
            if (matchedKey) el.dataset.i18nPlaceholder = matchedKey;
        });
    }

    function applySelectorTranslations(langCode) {
        const page = getCurrentPageName();
        (selectorTranslationMap[page] || []).forEach(([selector, key, mode]) => {
            document.querySelectorAll(selector).forEach((el) => {
                translateElement(el, key, langCode, el.textContent, mode);
            });
        });
    }

    function applyDomTranslations(langCode) {
        primeAutoTranslationKeys();
        document.documentElement.lang = langCode;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            translateElement(el, el.dataset.i18n, langCode, el.textContent, el.dataset.i18nMode);
        });
        document.querySelectorAll('[data-i18n-auto]').forEach((el) => {
            translateElement(el, el.dataset.i18nAuto, langCode, el.textContent, null);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            translateElement(el, el.dataset.i18nPlaceholder, langCode, el.getAttribute('placeholder'), 'placeholder');
        });
        applySelectorTranslations(langCode);
    }

    function applyAccessibilityPreferences() {
        const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const states = {
            reduceMotion: localStorage.getItem(STORAGE_KEYS.reduceMotion) === 'true' || prefersReduced,
            highContrast: localStorage.getItem(STORAGE_KEYS.highContrast) === 'true',
            largeText: localStorage.getItem(STORAGE_KEYS.largeText) === 'true',
            compactMode: localStorage.getItem(STORAGE_KEYS.compactMode) === 'true'
        };
        Object.entries(states).forEach(([attr, enabled]) => {
            document.documentElement.dataset[attr] = enabled ? 'true' : 'false';
            document.body?.setAttribute(`data-${attr.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, enabled ? 'true' : 'false');
        });
        preferenceToggles.forEach(({ id, key }) => {
            const pressed = localStorage.getItem(key) === 'true' || (key === STORAGE_KEYS.reduceMotion && prefersReduced && localStorage.getItem(key) !== 'false');
            const button = document.getElementById(id);
            if (button) {
                button.classList.toggle('active', pressed);
                button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
            }
        });
    }




    function applyTheme(themeKey) {
        const theme = themes[themeKey] || themes.cyan;
        document.documentElement.style.setProperty('--accent-primary', theme.primary);
        document.documentElement.style.setProperty('--accent-primary-glow', theme.glow);
        localStorage.setItem(STORAGE_KEYS.theme, themeKey);
        syncActiveItems('.theme-dot', 'theme', themeKey);
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
                document.getElementById('settings-hub')?.classList.remove('open');
            } else {
                node.classList.remove('active');
            }
            closed = true;
        });
        return closed;
    }

    function getBackTarget() {
        const pathName = getCurrentPageName();
        if (pathName === 'result.html') {
            return sessionStorage.getItem('xp_nav_origin') === 'vendor_dashboard.html' ? '/vendor_dashboard.html' : '/verify.html';
        }
        if (pathName === 'verify.html') return '/index.html';
        if (pathName === 'admin.html') return '/verify.html';
        return null;
    }

    function shouldShowBackButton() {
        const pathName = getCurrentPageName();
        return ['result.html', 'verify.html', 'admin.html'].includes(pathName);
    }



    



    function applyLang(langCode) {
        localStorage.setItem(STORAGE_KEYS.lang, langCode);
        syncActiveItems('.lang-item', 'lang', langCode);
        document.querySelectorAll('.lang-item').forEach(item => {
            item.classList.toggle('active', item.dataset.lang === langCode);
        });
        applyDomTranslations(langCode);
        if (window.UI && typeof window.UI.applyLang === 'function') {
            window.UI.applyLang();
        }
        window.dispatchEvent(new CustomEvent('xp:language-change', { detail: { lang: langCode } }));
    }

    function togglePreference(storageKey) {
        const nextValue = localStorage.getItem(storageKey) === 'true' ? 'false' : 'true';
        localStorage.setItem(storageKey, nextValue);
        applyAccessibilityPreferences();
        window.dispatchEvent(new CustomEvent('xp:accessibility-change', { detail: { key: storageKey, value: nextValue === 'true' } }));
    }

    // Inject Settings Hub UI
    const hub = document.createElement('div');
    hub.id = 'settings-hub';
    hub.innerHTML = `
        <div class="hub-orbit"></div><div class="hub-trigger" id="hub-trigger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div class="hub-panel shadow-premium hidden" id="hub-panel">
            <div class="hub-panel-head">
                <div class="hub-panel-title" data-i18n="settingsTitle">TACTICAL_SETTINGS</div>
                <div class="hub-panel-hint" data-i18n="settingsHint">Tune color and language with a smoother floating control.</div>
            </div>
            <div class="hub-section">
                <label data-i18n="accentColor">ACCENT_COLOR</label>
                <div class="theme-list">
                    ${Object.keys(themes).map(t => `
                        <div class="theme-dot" data-theme="${t}" style="background: ${themes[t].primary}"></div>
                    `).join('')}
                </div>
            </div>
            <div class="hub-section">
                <label data-i18n="systemLanguage">SYSTEM_LANGUAGE</label>
                <div class="lang-list">
                    ${langs.map(l => `
                        <div class="lang-item ${localStorage.getItem(STORAGE_KEYS.lang) === l.code ? 'active' : ''}" data-lang="${l.code}">
                            <span class="flag">${l.flag}</span>
                            <span class="name">${l.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="hub-section">
                <label data-i18n="accessibilityTitle">ACCESSIBILITY</label>
                <div class="pref-grid">
                    <button class="pref-toggle" id="reduce-motion-toggle" type="button" data-i18n="reduceMotion">REDUCE_MOTION</button>
                    <button class="pref-toggle" id="contrast-toggle" type="button" data-i18n="highContrast">HIGH_CONTRAST</button>
                    <button class="pref-toggle" id="large-text-toggle" type="button" data-i18n="largeText">LARGE_TEXT</button>
                    <button class="pref-toggle" id="compact-mode-toggle" type="button" data-i18n="compactMode">COMPACT_MODE</button>
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
            animation: hubFloat 4.8s ease-in-out infinite;
            transform-origin: bottom right;
        }
        #settings-hub.open { transform: translate(-10px, -6px); }
        .hub-orbit {
            position: absolute;
            inset: -8px;
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,0.04);
            opacity: 0.5;
            animation: hubOrbit 8s linear infinite;
            pointer-events: none;
        }
        @keyframes hubFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
        }
        @keyframes hubOrbit {
            from { transform: rotate(0deg) scale(1); }
            to { transform: rotate(360deg) scale(1.03); }
        }
        .hub-trigger {
            width: 46px;
            height: 46px;
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
            transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, background 0.35s ease;
        }
        .hub-trigger svg { width: 22px; height: 22px; transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1); animation: hubGearSpin 9s linear infinite; }
        .hub-trigger:hover { transform: translateY(-2px) scale(1.06); }
        .hub-trigger.active { transform: translate(-8px, -4px) scale(1.04); }
        .hub-trigger.active svg { transform: rotate(180deg) scale(1.05); animation-play-state: paused; }
        @keyframes hubGearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .hub-panel {
            width: 260px;
            background: rgba(2, 6, 23, 0.95);
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 1.2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease, visibility 0.35s ease;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            transform: translate3d(-6px, -8px, 0);
            transform-origin: bottom right;
        }
        .hub-panel.hidden {
            transform: translate3d(16px, 18px, 0) scale(0.92);
            opacity: 0;
            visibility: hidden;
        }
        .hub-panel-head {
            display: grid;
            gap: 0.4rem;
        }
        .hub-panel-title {
            font-size: 0.74rem;
            letter-spacing: 0.16em;
            color: #fff;
            font-weight: 800;
        }
        .hub-panel-hint {
            font-size: 0.68rem;
            line-height: 1.55;
            color: var(--text-secondary);
        }
        .hub-section, .hub-panel-head {
            transition: transform 0.45s ease, opacity 0.3s ease;
        }
        .hub-panel.hidden .hub-section, .hub-panel.hidden .hub-panel-head {
            opacity: 0;
            transform: translateX(18px);
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
        .pref-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
        }
        .pref-toggle {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            color: #cde5f5;
            padding: 0.8rem 0.7rem;
            font: inherit;
            font-size: 0.72rem;
            letter-spacing: 0.06em;
        }
        .pref-toggle.active {
            background: var(--accent-primary-glow);
            color: var(--accent-primary);
            border-color: rgba(255,255,255,0.16);
        }

        :root[data-high-contrast="true"] {
            filter: contrast(1.08) saturate(1.05);
        }
        :root[data-large-text="true"] {
            font-size: 18px;
        }
        :root[data-compact-mode="true"] .glass-panel,
        :root[data-compact-mode="true"] .app-container,
        :root[data-compact-mode="true"] .result-intro,
        :root[data-compact-mode="true"] .feedback-panel {
            --compact-scale: 0.96;
        }
        :root[data-compact-mode="true"] body {
            font-size: 15px;
            letter-spacing: -0.01em;
        }

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
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'cyan';
    applyTheme(savedTheme);
    applyAccessibilityPreferences();

    // Trigger Logic
    const trigger = document.getElementById('hub-trigger');
    const panel = document.getElementById('hub-panel');
    
    trigger.addEventListener('click', () => {
        trigger.classList.toggle('active');
        panel.classList.toggle('hidden');
        hub.classList.toggle('open', !panel.classList.contains('hidden'));
    });

    // Theme Logic
    bindDatasetClicks('.theme-dot', 'theme', applyTheme);

    // Language Logic
    bindDatasetClicks('.lang-item', 'lang', applyLang);
    preferenceToggles.forEach(({ id, key }) => {
        document.getElementById(id)?.addEventListener('click', () => togglePreference(key));
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
    let translationObserver = null;
    function mutationNeedsTranslation(mutations) {
        return mutations.some((mutation) => Array.from(mutation.addedNodes || []).some((node) => {
            if (node.nodeType !== 1) return false;
            if (node.id === 'settings-hub' || node.id === 'xp-nav-hub') return false;
            return !node.closest?.('#settings-hub, #xp-nav-hub');
        }));
    }
    window.addEventListener('DOMContentLoaded', () => {
        const lang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
        applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'cyan');
        applyAccessibilityPreferences();
        applyDomTranslations(lang);
        if (!translationObserver) {
            let rafId = null;
            translationObserver = new MutationObserver((mutations) => {
                if (!mutationNeedsTranslation(mutations)) return;
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => applyDomTranslations(localStorage.getItem(STORAGE_KEYS.lang) || 'en'));
            });
            translationObserver.observe(document.body, { childList: true, subtree: true });
        }
    });
})();
