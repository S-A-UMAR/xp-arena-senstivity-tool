const state = {
    brand: null,
    series: null,
    model: null,
    ram: 8,
    speed: 'medium',
    claw: '2',
    lang: localStorage.getItem('xp_lang') || 'en',
    vendor: 'XP CORE',
    logo: '',
    bg: '',
    bio: '',
    msg: '',
    ign: 'GUEST',
    rank: 'GLOBAL',
    handSize: 18.5,
    grip: 'palm',
    neuralScale: 5.0,
    manualSens: ''
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('🚀 SW_REGISTERED'))
            .catch(err => console.log('❌ SW_ERROR:', err));
    });
}

// 🛡️ Global Intelligence: Frontend Error Boundary (10/10 Resilience)
const SoftRecovery = {
    show(err) {
        if (document.getElementById('recoveryOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'recoveryOverlay';
        overlay.className = 'recovery-overlay reveal';
        overlay.innerHTML = `
            <div class="glass-card" style="text-align: center; border: 1px solid var(--accent-secondary);">
                <div class="logo-badge" style="background: rgba(255, 0, 0, 0.1); color: #ff4444; border-color: #ff4444;">SYSTEM_CRITICAL_HIT</div>
                <h2 style="margin: 1rem 0; font-family: var(--font-heading);">NEURAL_DESYNC_DETECTED</h2>
                <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                    AN UNEXPECTED FRAGMENTATION OCCURRED IN THE CALIBRATION LAYER.
                </p>
                <code style="display: block; background: #000; padding: 0.5rem; font-size: 0.6rem; margin-bottom: 2rem; border-radius: 4px; color: #ff4444;">${err?.message || 'UNKNOWN_FRAGMENT'}</code>
                <button class="action-btn" onclick="location.reload()" style="background: var(--accent-secondary);">REBOOT NEURAL ENGINE</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
};

window.onerror = (msg) => SoftRecovery.show({ message: msg });
window.onunhandledrejection = (e) => SoftRecovery.show({ message: e.reason });

let deferredPrompt;
const UI = {
    elements: {
        vaultOverlay: document.getElementById('vaultOverlay'),
        vaultInput: document.getElementById('vaultInput'),
        vaultStatus: document.getElementById('vaultStatus'),
        vaultAuthBtn: document.getElementById('vaultAuthBtn'),
        scannerOverlay: document.getElementById('scannerOverlay'),
        appContainer: document.getElementById('appContainer'),
        
        brand: document.getElementById('brandSelect'),
        series: document.getElementById('seriesSelect'),
        model: document.getElementById('modelSelect'),
        ramSelect: document.getElementById('ramSelect'),
        
        sensInput: document.getElementById('sensInput'),
        sensLabel: document.getElementById('sensLabel'),
        gripBtns: document.querySelectorAll('.segment-btn[data-grip]'),
        
        manualSens: document.getElementById('manualSens'),
        calculateBtn: document.getElementById('calculateBtn'),
        
        notifyToast: document.getElementById('notifyToast')
    },

    init() {
        console.log('--- XP ARENA NEURAL ENGINE INITIALIZING ---');
        this.populateBrands();
        this.attachVaultListeners();
        this.attachCalibrationListeners();
        this.loadProfile();
        this.initLanguage();
        this.initPWA();
        
        // Funnel Tracking: Landing View
        this.trackFunnel('landing_view');
        
        // SFX and Audio Initialization
        document.body.addEventListener('click', () => {
            if (window.SFX) window.SFX.init();
        }, { once: true });
    },

    async trackFunnel(type) {
        try {
            await fetch('/api/vault/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    event_type: type,
                    vendor_id: 'XP-PUBLIC',
                    session_id: localStorage.getItem('xp_session_id') || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
                    device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                })
            });
        } catch (e) {}
    },

    showInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        
        if (isIOS && !isStandalone) {
            this.notify("INSTALL_ID: TAP 'SHARE' THEN 'ADD TO HOME SCREEN'", "info");
        }
    },
    
    initPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.style.display = 'flex';
        });

        document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    const btn = document.getElementById('pwaInstallBtn');
                    if (btn) btn.style.display = 'none';
                }
                deferredPrompt = null;
            } else {
                this.showInstallInstructions();
            }
        });
    },

    notify(message, type = 'info') {
        if (window.notify) {
            window.notify(message, type);
        }
    },

    attachVaultListeners() {
        if (!this.elements.vaultInput) return;

        // 🧠 Auto-Remember Functionality
        const savedCode = localStorage.getItem('xp_last_entry_code');
        if (savedCode) {
            this.elements.vaultInput.value = savedCode;
        }

        this.elements.vaultInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        if (this.elements.vaultAuthBtn) {
            this.elements.vaultAuthBtn.onclick = () => {
                this.verifyVault(this.elements.vaultInput.value);
            };
        }

        this.elements.vaultInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.verifyVault(e.target.value.toUpperCase());
        });
    },

    async verifyVault(code) {
        if (this.verifying) return; // 🛡️ Prevent double-triggers
        
        const status = this.elements.vaultStatus;
        const input = this.elements.vaultInput;

        try {
            this.verifying = true;
            status.textContent = 'CONNECTING TO XP VAULT...';
            input.classList.remove('error');

            const response = await fetch('/api/vault/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    input: code,
                    user_ign: state.ign,
                    user_region: state.rank
                })
            });
            const contentType = response.headers.get('content-type');
            let data = {};
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.warn('NON_JSON_OVERRIDE:', text.substring(0, 100));
                data = { error: 'SERVER_OFFLINE // DB_SYNC_REQUIRED' };
            }

            if (!response.ok) {
                status.textContent = data.error || 'INVALID AUTHENTICATION';
                input.classList.add('error');
                if (window.SFX) window.SFX.play('click');
                this.verifying = false;
                return;
            }

            status.textContent = 'ACCESS GRANTED // SYNCHRONIZING';
            status.style.color = 'var(--accent-primary)';
            if (window.SFX) window.SFX.play('ping');

            setTimeout(async () => {
                if (data.redirect && data.type === 'user') {
                    // 🧬 THE HYPE MACHINE: Tech Scanner Bridge
                    const scanner = document.getElementById('scannerOverlay');
                    const label = document.getElementById('scannerLabel');
                    const progress = document.getElementById('scannerProgress');
                    
                    if (scanner && label && progress) {
                        scanner.classList.add('active');
                        
                        // Sequence 1: Identifying
                        label.textContent = "IDENTIFYING_HARDWARE_SIGNATURE...";
                        progress.style.strokeDashoffset = "180"; // ~35%
                        
                        await new Promise(r => setTimeout(r, 800));
                        
                        // Sequence 2: Calibrating
                        label.textContent = "CALIBRATING_NEURAL_SENSITIVITY...";
                        progress.style.strokeDashoffset = "90"; // ~65%
                        
                        await new Promise(r => setTimeout(r, 800));
                        
                        // Sequence 3: Finalizing
                        label.textContent = "FINALIZING_RECOIL_BUFF_ALGORITHMS...";
                        progress.style.strokeDashoffset = "0"; // 100%
                        
                        await new Promise(r => setTimeout(r, 900));
                    }

                    localStorage.setItem('xp_sensitivity_profile_last_result', JSON.stringify({ ...data.results, advice: data.advice }));
                    localStorage.setItem('xp_last_entry_code', code);
                    if (data.branding) localStorage.setItem('xp_last_branding', JSON.stringify(data.branding));
                    
                    window.location.href = data.redirect;
                    return;
                }

                if (data.redirect) {
                    window.location.href = data.redirect;
                    return;
                }

                this.verifying = false;
                this.elements.vaultOverlay.classList.add('hidden');
                this.elements.appContainer.classList.remove('hidden');
                
                if (data.branding) {
                    localStorage.setItem('xp_last_branding', JSON.stringify(data.branding));
                    this.applyBranding(data.branding);
                }
                
                localStorage.setItem('xp_last_entry_code', code);
            }, 1000);

        } catch (e) {
            this.verifying = false;
            status.textContent = 'ENCRYPTION ERROR // RETRY';
            console.error('VAULT_ERR:', e);
        }
    },

    populateBrands() {
        if (!window.DEVICES || !this.elements.brand) return;
        this.elements.brand.innerHTML = '<option value="">SELECT BRAND</option>';
        window.DEVICES.forEach(b => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = b.brand;
            this.elements.brand.appendChild(opt);
        });

        // 📱 Device Auto-Detection
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone') || ua.includes('ipad')) {
            this.elements.brand.value = 'Apple';
            state.brand = 'Apple';
            this.updateSeriesDropdown();
        } else if (ua.includes('samsung')) {
            this.elements.brand.value = 'Samsung';
            state.brand = 'Samsung';
            this.updateSeriesDropdown();
        }
    },

    attachCalibrationListeners() {
        const { brand, series, model, ramSelect, sensInput, manualSens, calculateBtn, gripBtns } = this.elements;

        brand.addEventListener('change', () => {
            state.brand = brand.value;
            this.updateSeriesDropdown();
            this.autoSetRamForModel();
        });

        series.addEventListener('change', () => {
            state.series = series.value;
            this.updateModelDropdown();
        });

        model.addEventListener('change', () => {
            state.model = model.value;
            this.autoSetRamForModel();
            this.saveProfile();
        });

        if (ramSelect) {
            ramSelect.addEventListener('change', () => {
                state.ram = parseInt(ramSelect.value, 10) || 8;
            });
        }

        sensInput.addEventListener('input', (e) => {
            state.neuralScale = parseFloat(e.target.value);
            this.elements.sensLabel.textContent = state.neuralScale.toFixed(1);
        });

        manualSens.addEventListener('input', (e) => {
            state.manualSens = e.target.value;
        });

        gripBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                gripBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.grip = btn.dataset.grip;
                if (window.SFX) window.SFX.play('ping');
            });
        });

        calculateBtn.addEventListener('click', () => this.handleCalculate());
    },

    updateSeriesDropdown() {
        const { series, model } = this.elements;
        series.innerHTML = '<option value="">SELECT SERIES</option>';
        model.innerHTML = '<option value="">SELECT MODEL</option>';
        model.disabled = true;

        if (!state.brand) {
            series.disabled = true;
            return;
        }

        const brandData = window.DEVICES.find(b => b.brand === state.brand);
        if (brandData) {
            brandData.series.forEach(s => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = s.name;
                series.appendChild(opt);
            });
            series.disabled = false;
        }
    },

    updateModelDropdown() {
        const { model } = this.elements;
        model.innerHTML = '<option value="">SELECT MODEL</option>';
        
        if (!state.brand || !state.series) {
            model.disabled = true;
            return;
        }

        const brandData = window.DEVICES.find(b => b.brand === state.brand);
        const seriesData = brandData.series.find(s => s.name === state.series);
        
        seriesData.models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = m;
            model.appendChild(opt);
        });
        model.disabled = false;
    },

    estimateRamByModel() {
        const brand = (state.brand || '').toLowerCase();
        const model = (state.model || '').toLowerCase();
        if (!model) return 8;
        if (brand === 'apple') {
            if (model.includes('17') || model.includes('16') || model.includes('15 pro') || model.includes('14 pro')) return 8;
            if (model.includes('13 pro') || model.includes('12 pro')) return 6;
            return 4;
        }
        if (/(ultra|pro\+|rog|redmagic|gaming|gt|x100|12|11|10 pro)/.test(model)) return 12;
        if (/(plus|note|neo|f\d|x\d|v\d|reno|nord|pova|camon)/.test(model)) return 8;
        return 6;
    },

    autoSetRamForModel() {
        const ramGroup = document.getElementById('ramGroup');
        const ramSelect = this.elements.ramSelect;
        if (!ramSelect || !ramGroup) return;

        if ((state.brand || '').toLowerCase() === 'apple') {
            state.ram = this.estimateRamByModel();
            ramSelect.value = String(state.ram);
            ramGroup.style.display = 'none';
            return;
        }

        ramGroup.style.display = 'block';
        state.ram = this.estimateRamByModel();
        ramSelect.value = String(state.ram);
    },

    async handleCalculate() {
        if (!state.manualMode && (!state.brand || !state.model)) {
            this.notify("INCOMPLETE PROFILE: SELECT BRAND AND MODEL", "error");
            return;
        }

        if (state.manualMode && (!state.manualSens || isNaN(parseFloat(state.manualSens)))) {
            this.notify("MANUAL MASTERING: ENTER A VALID BASE VALUE", "error");
            return;
        }

        if (window.SFX) window.SFX.play('calculate');
        this.trackFunnel('calibration_start');
        
        this.notify("NEURAL CALIBRATION IN PROGRESS...", "success");
        
        try {
            // Apply Global Offset from system settings if available
            const globalOffset = parseFloat(localStorage.getItem('xp_global_offset')) || 1.0;

            const payload = {
                ...state,
                globalOffset,
                manualSens: state.manualMode ? Number.parseFloat(state.manualSens) : undefined
            };
            const res = await fetch('/api/vault/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.results) {
                if (window.SaaSAnalytics) window.SaaSAnalytics.track('code_generated');
                localStorage.setItem('xp_sensitivity_profile_last_result', JSON.stringify(data.results));
                localStorage.setItem('xp_sensitivity_profile', JSON.stringify(state));
                localStorage.setItem('xp_last_entry_code', data.entry_code); // 🚀 Store for Result Page

                setTimeout(() => {
                    window.location.href = 'result.html';
                }, 1500);
            }
        } catch (e) {
            this.notify("NEURAL ENGINE UNREACHABLE", "error");
        }
    },

    saveProfile() {
        localStorage.setItem('xp_sensitivity_profile', JSON.stringify(state));
    },

    loadProfile() {
        const saved = JSON.parse(localStorage.getItem('xp_sensitivity_profile') || '{}');
        Object.assign(state, saved);
        
        if (state.brand) {
            this.elements.brand.value = state.brand;
            this.updateSeriesDropdown();
            if (state.series) {
                this.elements.series.value = state.series;
                this.updateModelDropdown();
                if (state.model) this.elements.model.value = state.model;
            }
        }
        
        if (this.elements.sensInput) {
            this.elements.sensInput.value = state.neuralScale;
            this.elements.sensLabel.textContent = state.neuralScale.toFixed(1);
        }
        if (this.elements.ramSelect) {
            this.elements.ramSelect.value = String(state.ram || 8);
        }
        this.autoSetRamForModel();
    },
       initLanguage() {
        this.applyLang();
    },
    applyLang() {
        const lang = localStorage.getItem('xp_lang') || 'en';
        const dict = (window.LANGUAGES && window.LANGUAGES[lang]) || window.LANGUAGES?.en;
        if (!dict) return;

        // 🤖 Automated Attribute-Based Translation
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });

        // 🛡️ Special Case Handling (Selects, etc)
        const brandLabel = document.querySelector('#hardwareSection .form-group .form-label');
        if (brandLabel) brandLabel.textContent = dict.brandLabel || 'Device Architecture';
        const ramLabel = document.querySelector('#ramGroup .form-label');
        if (ramLabel) ramLabel.textContent = dict.ramLabel || 'Hardware RAM';
        
        const calcBtn = document.getElementById('calculateBtn');
        if (calcBtn) calcBtn.textContent = dict.calcBtn || 'GENERATE OPTIMIZED GUIDE';
    },

    toggleManualMode(active) {
        const standard = document.getElementById('standardMastering');
        const manual = document.getElementById('manualMastering');
        const hardwareSection = document.getElementById('hardwareSection');
        
        if (active) {
            standard.style.display = 'none';
            manual.style.display = 'block';
            hardwareSection.style.opacity = '0.3';
            hardwareSection.style.pointerEvents = 'none';
            state.manualMode = true;
            if (window.SFX) window.SFX.play('click');
        } else {
            standard.style.display = 'block';
            manual.style.display = 'none';
            hardwareSection.style.opacity = '1';
            hardwareSection.style.pointerEvents = 'auto';
            state.manualMode = false;
        }
    },

    applyBranding(config) {
        if (!config) return;
        if (config.colors && config.colors.primary) {
            document.documentElement.style.setProperty('--accent-primary', config.colors.primary);
        }
    }
};
window.UI = UI;

window.toggleLowPerf = () => {
    const isLow = localStorage.getItem('xp_low_perf') === 'true';
    const newStatus = !isLow;
    localStorage.setItem('xp_low_perf', newStatus);
    
    if (newStatus) {
        if (window.ThreeHub) window.ThreeHub.stop();
        document.getElementById('perfBtn').textContent = 'MODE: LOW_LATENCY';
        document.body.style.background = 'var(--bg-dark)';
        UI.notify('LOW_PERFORMANCE_MODE_ACTIVE', 'info');
    } else {
        location.reload(); 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const btn = document.getElementById('pwaInstallBtn');
    if (btn && isIOS) {
        btn.style.display = 'block';
        btn.textContent = 'INSTALL: SHARE → A2HS';
    }
    
    // ⚡ Adaptive Performance Check
    if (localStorage.getItem('xp_low_perf') === 'true') {
        setTimeout(() => {
            if (window.ThreeHub) window.ThreeHub.stop();
            const btn = document.getElementById('perfBtn');
            if (btn) btn.textContent = 'MODE: LOW_LATENCY';
            document.body.style.background = 'var(--bg-dark)';
        }, 100);
    }
});

window.addEventListener('xp:language-change', () => {
    if (window.UI && typeof window.UI.applyLang === 'function') {
        window.UI.applyLang();
    }
});
