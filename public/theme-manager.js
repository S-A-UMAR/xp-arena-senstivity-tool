/**
 * AXP NEXUS OS — THEME & LANGUAGE MANAGER
 * Handles global accent colors, persistent language choice, 
 * and injections of unified settings components.
 */

const ThemeManager = {
    config: {
        accent: localStorage.getItem('axp_accent') || 'cyan',
        lang: localStorage.getItem('axp_lang') || 'en',
    },

    accents: {
        cyan: { primary: '#00f2fe', dim: 'rgba(0, 242, 254, 0.15)', glow: 'rgba(0, 242, 254, 0.3)', border: 'rgba(0, 242, 254, 0.25)' },
        violet: { primary: '#a855f7', dim: 'rgba(168, 85, 247, 0.15)', glow: 'rgba(168, 85, 247, 0.3)', border: 'rgba(168, 85, 247, 0.25)' },
        gold: { primary: '#f59e0b', dim: 'rgba(245, 158, 11, 0.15)', glow: 'rgba(245, 158, 11, 0.3)', border: 'rgba(245, 158, 11, 0.25)' },
        emerald: { primary: '#10b981', dim: 'rgba(16, 185, 129, 0.15)', glow: 'rgba(16, 185, 129, 0.3)', border: 'rgba(16, 185, 129, 0.25)' },
        crimson: { primary: '#ef4444', dim: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.25)' }
    },

    init() {
        this.applyTheme(this.config.accent);
        this.applyLanguage(this.config.lang);
        this.injectSettingsFAB();
        
        // Listen for vendor tier classes to override defaults
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body.classList.contains('tier-gold')) this.applyTheme('gold');
            this.syncTranslations();
        });
    },

    applyTheme(themeKey) {
        const colors = this.accents[themeKey] || this.accents.cyan;
        const root = document.documentElement;
        
        root.style.setProperty('--accent-primary', colors.primary);
        root.style.setProperty('--accent-primary-dim', colors.dim);
        root.style.setProperty('--accent-primary-glow', colors.glow);
        root.style.setProperty('--accent-primary-border', colors.border);
        
        // Update complementary legacy variables
        root.style.setProperty('--cyan', colors.primary);
        root.style.setProperty('--cyan-dim', colors.dim);
        root.style.setProperty('--cyan-glow', colors.glow);
        root.style.setProperty('--cyan-border', colors.border);
        
        localStorage.setItem('axp_accent', themeKey);
        this.config.accent = themeKey;
        
        // Notify any listeners
        window.dispatchEvent(new CustomEvent('axp_theme_changed', { detail: { theme: themeKey, colors } }));
    },

    applyLanguage(langKey) {
        if (!window.LANGUAGES || !window.LANGUAGES[langKey]) return;
        localStorage.setItem('axp_lang', langKey);
        this.config.lang = langKey;
        this.syncTranslations();
    },

    syncTranslations() {
        if (!window.LANGUAGES) return;
        const langData = window.LANGUAGES[this.config.lang];
        const pageExtras = window.LANGUAGE_PAGE_EXTRAS ? window.LANGUAGE_PAGE_EXTRAS[this.config.lang] : {};
        const combined = { ...langData, ...pageExtras };

        document.querySelectorAll('[data-t]').forEach(el => {
            const key = el.getAttribute('data-t');
            if (combined[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = combined[key];
                } else {
                    el.innerHTML = combined[key];
                }
            }
        });
        
        // Handle dropdowns
        document.querySelectorAll('option[data-t]').forEach(opt => {
             const key = opt.getAttribute('data-t');
             if (combined[key]) opt.textContent = combined[key];
        });
    },

    injectSettingsFAB() {
        // Prevent double injection
        if (document.getElementById('axpSettingsFAB')) return;

        const fab = document.createElement('div');
        fab.id = 'axpSettingsFAB';
        fab.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 52px;
            height: 52px;
            background: rgba(8, 13, 24, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid var(--accent-primary-border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        
        fab.onmouseenter = () => {
            fab.style.transform = 'scale(1.1) rotate(45deg)';
            fab.style.borderColor = 'var(--accent-primary)';
        };
        fab.onmouseleave = () => {
            fab.style.transform = 'scale(1) rotate(0)';
            fab.style.borderColor = 'var(--accent-primary-border)';
        };
        
        fab.onclick = () => this.toggleSettingsModal();
        
        document.body.appendChild(fab);
    },

    toggleSettingsModal() {
        let modal = document.getElementById('axpSettingsModal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 400);
            return;
        }

        modal = document.createElement('div');
        modal.id = 'axpSettingsModal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(2, 4, 9, 0.85);
            backdrop-filter: blur(15px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            width: 90%;
            max-width: 400px;
            background: var(--bg-surface);
            border: 1.5px solid var(--accent-primary-border);
            border-radius: 32px;
            padding: 2.5rem;
            position: relative;
            box-shadow: 0 40px 100px rgba(0,0,0,0.8);
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 900; color: #fff; letter-spacing: -0.02em;">TACTICAL_SETTINGS</h2>
                    <p style="font-size: 0.65rem; color: var(--tx-muted); font-weight: 700; margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase;">Manage node appearance & language</p>
                </div>
                <button onclick="ThemeManager.toggleSettingsModal()" style="background: none; border: none; color: var(--tx-muted); cursor: pointer; font-size: 1.5rem;">&times;</button>
            </div>

            <div style="margin-bottom: 2rem;">
                <label style="display: block; font-size: 0.6rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1rem;">ACCENT_FREQUENCY</label>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${Object.keys(this.accents).map(k => `
                        <div class="accent-dot ${this.config.accent === k ? 'active' : ''}" 
                             onclick="ThemeManager.applyTheme('${k}'); this.parentElement.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active')); this.classList.add('active');"
                             style="width: 32px; height: 32px; border-radius: 50%; background: ${this.accents[k].primary}; cursor: pointer; border: 2px solid ${this.config.accent === k ? '#fff' : 'transparent'}; box-shadow: 0 0 15px ${this.accents[k].glow}; transition: 0.2s;">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <label style="display: block; font-size: 0.6rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1rem;">CORE_LANGUAGE</label>
                <select onchange="ThemeManager.applyLanguage(this.value)" style="width: 100%; background: var(--bg-raised); border: 1.5px solid var(--bd-soft); border-radius: 12px; padding: 0.85rem; color: #fff; font-family: var(--font-mono); font-weight: 700; font-size: 0.8rem; outline: none;">
                    <option value="en" ${this.config.lang === 'en' ? 'selected' : ''}>ENGLISH (US)</option>
                    <option value="pt" ${this.config.lang === 'pt' ? 'selected' : ''}>PORTUGUÊS (BR)</option>
                    <option value="es" ${this.config.lang === 'es' ? 'selected' : ''}>ESPAÑOL (LATAM)</option>
                    <option value="ar" ${this.config.lang === 'ar' ? 'selected' : ''}>العربية (SA)</option>
                    <option value="tr" ${this.config.lang === 'tr' ? 'selected' : ''}>TÜRKÇE (TR)</option>
                    <option value="ru" ${this.config.lang === 'ru' ? 'selected' : ''}>РУССКИЙ (RU)</option>
                </select>
            </div>

            <button onclick="ThemeManager.toggleSettingsModal()" class="btn-cta" style="width: 100%; padding: 1rem; border-radius: 16px; font-size: 0.75rem;">SAVE_AND_RESUME</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add internal styles if not exists
        if (!document.getElementById('axpSettingsStyles')) {
            const s = document.createElement('style');
            s.id = 'axpSettingsStyles';
            s.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                #axpSettingsModal.closing { animation: fadeOut 0.4s forwards; }
                #axpSettingsModal.closing > div { animation: slideDown 0.4s forwards; }
                @keyframes fadeOut { to { opacity: 0; } }
                @keyframes slideDown { to { transform: translateY(30px) scale(0.95); opacity: 0; } }
                .accent-dot:hover { transform: scale(1.1); filter: brightness(1.2); }
                .accent-dot.active { transform: scale(1.2); outline: 3px solid var(--accent-primary-dim); }
            `;
            document.head.appendChild(s);
        }
    }
};

ThemeManager.init();
