(function() {
    const themes = [
        { id: 'cyan', name: 'CYAN', primary: '#00f2fe' },
        { id: 'gold', name: 'GOLD', primary: '#f59e0b' },
        { id: 'purple', name: 'PURPLE', primary: '#a855f7' },
        { id: 'green', name: 'EMERALD', primary: '#00ff88' },
        { id: 'red', name: 'CRIMSON', primary: '#ff4444' }
    ];

    const STORAGE_KEYS = {
        theme: 'xp_preferred_theme',
        lang: 'xp_lang',
        reduceMotion: 'xp_reduce_motion',
        highContrast: 'xp_high_contrast',
        largeText: 'xp_large_text',
        compactMode: 'xp_compact_mode',
        screenShake: 'xp_screen_shake'
    };

    function applyTheme(themeId) {
        document.documentElement.dataset.theme = themeId;
        localStorage.setItem(STORAGE_KEYS.theme, themeId);
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === themeId);
        });
    }

    function applyLang(lang) {
        localStorage.setItem(STORAGE_KEYS.lang, lang);
        document.querySelectorAll('.lang-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.lang === lang);
        });
        // Trigger global translation if available
        if (window.applyDomTranslations) window.applyDomTranslations(lang);
    }

    function applyAccessibility() {
        const states = {
            reduceMotion: localStorage.getItem(STORAGE_KEYS.reduceMotion) === 'true',
            highContrast: localStorage.getItem(STORAGE_KEYS.highContrast) === 'true',
            largeText: localStorage.getItem(STORAGE_KEYS.largeText) === 'true',
            compactMode: localStorage.getItem(STORAGE_KEYS.compactMode) === 'true',
            screenShake: localStorage.getItem(STORAGE_KEYS.screenShake) !== 'false' // Default to true
        };

        Object.entries(states).forEach(([key, enabled]) => {
            document.documentElement.dataset[key] = enabled;
            const btn = document.getElementById(`${key}-toggle`);
            if (btn) {
                btn.classList.toggle('active', enabled);
                btn.setAttribute('aria-pressed', enabled);
            }
        });
    }

    function togglePref(key) {
        const current = localStorage.getItem(STORAGE_KEYS[key]) === 'true';
        localStorage.setItem(STORAGE_KEYS[key], !current);
        applyAccessibility();
    }

    // Initialize Hub UI
    const hub = document.createElement('div');
    hub.id = 'settings-hub';
    hub.innerHTML = `
        <div class="hub-trigger" id="hub-trigger" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div class="hub-panel hidden" id="hub-panel">
            <div class="hub-head">
                <div class="hub-title">SYSTEM_CALIBRATION</div>
                <div class="hub-hint">Configure neural interface and visual feedback.</div>
            </div>
            
            <div class="hub-section">
                <label>ENVIRONMENT_THEME</label>
                <div class="theme-list">
                    ${themes.map(t => `<div class="theme-dot" data-theme="${t.id}" style="background: ${t.primary}" title="${t.name}"></div>`).join('')}
                </div>
            </div>

            <div class="hub-section">
                <label>INTERFACE_LANGUAGE</label>
                <div class="lang-grid" id="langGrid">
                    <div class="lang-chip" data-lang="en">EN</div>
                    <div class="lang-chip" data-lang="es">ES</div>
                    <div class="lang-chip" data-lang="pt">PT</div>
                    <div class="lang-chip" data-lang="id">ID</div>
                    <div class="lang-chip" data-lang="th">TH</div>
                </div>
            </div>

            <div class="hub-section">
                <label>ACCESSIBILITY_PROTOCOL</label>
                <div class="pref-grid">
                    <button class="pref-toggle" id="highContrast-toggle" onclick="window.XP_SETTINGS.toggle('highContrast')">HIGH_CONTRAST</button>
                    <button class="pref-toggle" id="largeText-toggle" onclick="window.XP_SETTINGS.toggle('largeText')">LARGE_TEXT</button>
                    <button class="pref-toggle" id="compactMode-toggle" onclick="window.XP_SETTINGS.toggle('compactMode')">COMPACT_UI</button>
                    <button class="pref-toggle" id="reduceMotion-toggle" onclick="window.XP_SETTINGS.toggle('reduceMotion')">REDUCE_MOTION</button>
                    <button class="pref-toggle" id="screenShake-toggle" onclick="window.XP_SETTINGS.toggle('screenShake')">HAPTIC_SHAKE</button>
                </div>
            </div>

            <div class="hub-footer">
                <div class="text-ghost font-mono" style="font-size: 0.6rem;">AXP_OS_V3.2.1 // SHIELD_ACTIVE</div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #settings-hub {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
            font-family: 'Outfit', sans-serif;
        }
        .hub-trigger {
            width: 48px; height: 48px;
            background: rgba(8, 13, 24, 0.8);
            backdrop-filter: blur(20px);
            border: 1.5px solid var(--accent-primary);
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            color: var(--accent-primary);
            cursor: pointer;
            box-shadow: 0 0 20px var(--accent-primary-glow);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hub-trigger svg { width: 22px; height: 22px; transition: transform 0.6s; }
        .hub-trigger:hover { transform: scale(1.1) rotate(5deg); }
        .hub-trigger.active { transform: rotate(90deg); background: var(--accent-primary); color: #000; }

        .hub-panel {
            width: 280px;
            background: rgba(8, 13, 24, 0.95);
            backdrop-filter: blur(40px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 1.5rem;
            display: flex; flex-direction: column; gap: 1.5rem;
            box-shadow: 0 20px 80px rgba(0,0,0,0.8);
            transform-origin: bottom right;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hub-panel.hidden { transform: scale(0.9) translateY(20px); opacity: 0; visibility: hidden; }

        .hub-title { font-size: 0.75rem; font-weight: 900; letter-spacing: 0.15em; color: var(--accent-primary); }
        .hub-hint { font-size: 0.65rem; color: var(--tx-sub); margin-top: 4px; line-height: 1.4; }
        .hub-section label { display: block; font-size: 0.6rem; font-weight: 800; color: var(--tx-muted); letter-spacing: 0.12em; margin-bottom: 0.75rem; }

        .theme-list { display: flex; gap: 10px; justify-content: space-between; }
        .theme-dot { width: 32px; height: 32px; border-radius: 10px; cursor: pointer; border: 2.5px solid transparent; transition: 0.2s; }
        .theme-dot.active { border-color: #fff; box-shadow: 0 0 15px rgba(255,255,255,0.3); }

        .lang-grid { display: flex; gap: 6px; flex-wrap: wrap; }
        .lang-chip {
            padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1); color: var(--tx-sub);
            font-size: 0.6rem; font-weight: 800; cursor: pointer; transition: 0.2s;
        }
        .lang-chip:hover { border-color: var(--accent-primary); color: #fff; }
        .lang-chip.active { background: var(--accent-primary); color: #000; border-color: var(--accent-primary); }

        .pref-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .pref-toggle {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 10px 14px;
            color: var(--tx-sub);
            font-size: 0.65rem; font-weight: 700; text-align: left;
            cursor: pointer; transition: 0.2s;
        }
        .pref-toggle:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .pref-toggle.active { background: var(--accent-primary-dim); border-color: var(--accent-primary-border); color: var(--accent-primary); }

        :root[data-highContrast="true"] { filter: contrast(1.15) saturate(1.1); }
        :root[data-largeText="true"] { font-size: 18px; }
        :root[data-compactMode="true"] .card, 
        :root[data-compactMode="true"] .page-wrap { padding: 1rem; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(hub);

    // Initial State
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'cyan';
    const savedLang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
    applyTheme(savedTheme);
    applyLang(savedLang);
    applyAccessibility();

    // Event Listeners
    const trigger = document.getElementById('hub-trigger');
    const panel = document.getElementById('hub-panel');
    trigger.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        trigger.classList.toggle('active');
    });

    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
    });

    document.querySelectorAll('.lang-chip').forEach(chip => {
        chip.addEventListener('click', () => applyLang(chip.dataset.lang));
    });

    // Global Access for onclick
    window.XP_SETTINGS = {
        toggle: (key) => togglePref(key)
    };

})();
