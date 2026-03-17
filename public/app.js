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
    ign: '',
    rank: '',
    yt: '',
    ig: '',
    dc: '',
    handSize: 18.5,
    grip: 'palm'
};

const UI = {
    elements: {
        vaultOverlay: document.getElementById('vaultOverlay'),
        vaultInput: document.getElementById('vaultInput'),
        vaultStatus: document.getElementById('vaultStatus'),
        appWrapper: document.getElementById('appWrapper'),
        lockOverlay: document.getElementById('vendorLock')
    },

    init() {
        this.initBiometrics();
        this.attachVaultListeners();
        this.registerServiceWorker();
        
        document.body.addEventListener('click', () => {
            if (window.SFX) window.SFX.init();
        }, { once: true });
    },

    attachVaultListeners() {
        if (!this.elements.vaultInput) return;

        this.elements.vaultInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                this.handleCodeInput(e);
            }
        });
    },

    handleCodeInput(e) {
        const code = e.target.value.toUpperCase();
        e.target.value = code;
        
        if (code.length === 6) {
            if (window.NEURAL_AUDIO) window.NEURAL_AUDIO.play('success');
            this.verifyVault(code);
        }
    },

    async verifyVault(code) {
        const status = this.elements.vaultStatus;
        const input = this.elements.vaultInput;

        try {
            status.textContent = 'CONNECTING TO VAULT...';
            status.className = 'vault-status status-sync';
            input.classList.remove('error');

            const profile = JSON.parse(localStorage.getItem('xp_sensitivity_profile') || '{}');
            const response = await fetch('/api/vault/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    input: code,
                    user_ign: profile.ign || 'Guest',
                    user_region: profile.rank || 'Universal'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (window.SFX) window.SFX.play('click'); 
                status.textContent = data.error || 'ACCESS DENIED';
                status.className = 'vault-status status-error';
                
                // Re-trigger shake animation
                input.classList.remove('error');
                void input.offsetWidth; // Force reflow
                input.classList.add('error');
                return;
            }

            if (window.SFX) window.SFX.play('ping');
            status.textContent = data.message || 'ACCESS GRANTED';
            status.className = 'vault-status status-success';
            
            setTimeout(() => {
                if (data.type === 'admin') {
                    window.location.href = data.redirect;
                } else if (data.type === 'vendor') {
                    localStorage.setItem('xp_vendor_token', code);
                    localStorage.setItem('xp_vendor_config', JSON.stringify(data.vendor.config));
                    window.location.href = data.redirect;
                } else if (data.type === 'user') {
                    localStorage.setItem('xp_last_entry_code', code);
                    localStorage.setItem('xp_last_result_data', JSON.stringify(data.results));
                    localStorage.setItem('xp_last_branding', JSON.stringify(data.branding));
                    window.location.href = data.redirect;
                }
            }, 800);

        } catch (e) {
            console.error('Vault Error:', e);
            status.textContent = 'ENCRYPTION FAILURE // RETRY';
            status.className = 'vault-status status-error';
        }
    },

    populateBrands() {
        if (!window.DEVICES) return;
        window.DEVICES.forEach(b => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = b.brand;
            this.elements.brand.appendChild(opt);
        });
    },

    attachListeners() {
        this.elements.brand.addEventListener('change', (e) => {
            if (window.SFX) window.SFX.play('click');
            state.brand = e.target.value;
            state.series = null;
            state.model = null;
            this.updateSeriesDropdown();
            this.handleModelSelect({ target: { value: state.model } });
            this.saveProfile();
        });

        this.elements.series.addEventListener('change', (e) => {
            if (window.SFX) window.SFX.play('click');
            state.series = e.target.value;
            state.model = null;
            this.updateModelDropdown();
            this.saveProfile();
            this.handleModelSelect({ target: { value: state.model } });
        });

        this.elements.model.addEventListener('change', (e) => {
            if (window.SFX) window.SFX.play('click');
            this.handleModelSelect(e);
        });

        this.elements.ramSlider.addEventListener('input', (e) => {
            state.ram = parseInt(e.target.value);
            this.elements.ramLabel.textContent = `${state.ram} GB`;
        });
        
        this.elements.ramSlider.addEventListener('change', () => {
             if (window.SFX) window.SFX.play('click');
             this.saveProfile();
        });

        this.setupSegments(this.elements.speedBtns, 'speed');
        this.setupSegments(this.elements.clawBtns, 'claw');

        this.elements.langBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.SFX) window.SFX.play('click');
                state.lang = btn.dataset.lang;
                localStorage.setItem('xp_lang', state.lang);
                this.elements.langBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.translateUI();
            });
        });

        this.elements.calcBtn.addEventListener('click', () => {
            state.ign = document.getElementById('ignInput').value;
            state.rank = document.getElementById('rankSelect').value;
            this.handleCalculate();
        });
    },

    setupSegments(buttons, stateKey) {
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.SFX) window.SFX.play('click');
                buttons.forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                state[stateKey] = target.dataset.value;
                this.saveProfile();
            });
        });
    },

    updateSeriesDropdown() {
        const { series, model } = this.elements;
        series.innerHTML = '<option value="">Select Series</option>';
        model.innerHTML = '<option value="">Select Model</option>';
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
        model.innerHTML = '<option value="">Select Model</option>';
        
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
        
        if (state.model) model.value = state.model;
    },

    handleModelSelect(e) {
        state.model = e ? e.target.value : null;
        this.saveProfile();
        
        const ramGroup = document.getElementById('ramGroup');
        const graphicsBox = document.getElementById('graphicsDisplay');
        if (!ramGroup) return;

        const tier = Calculator.getTier(state.brand, state.series, state.model);
        const recGraphics = Calculator.getGraphics(tier);
        if (graphicsBox) graphicsBox.textContent = recGraphics.toUpperCase();

        if (state.brand === 'Apple') {
            ramGroup.style.display = 'none'; 
            state.ram = 8; 
        } else {
            ramGroup.style.display = 'block'; 
            if (state.model) {
                if (state.model.includes('Ultra') || state.model.includes('Pro Max') || state.model.includes('Gaming') || state.model.includes('GT')) {
                    state.ram = 12;
                } else if (state.model.includes('Pro') || state.model.includes('Plus') || state.model.includes('Note')) {
                    state.ram = 8;
                } else {
                    state.ram = 6;
                }
                this.elements.ramLabel.textContent = `${state.ram} GB`;
                this.elements.ramSlider.value = state.ram;
            }
        }
    },

    handleCalculate() {
        if (!state.brand || !state.series || !state.model) {
            if (window.SFX) window.SFX.play('click');
            if (window.notify) {
                window.notify("INCOMPLETE PROFILE: Please select Brand, Series, and Model.", "error");
            } else {
                alert("INCOMPLETE PROFILE: Please select Brand, Series, and Model.");
            }
            return;
        }

        const overlay = document.getElementById('loadingOverlay');
        const stepText = document.getElementById('loaderStep');
        const steps = [
            "ANALYZING DEVICE ARCHITECTURE",
            "FETCHING PERFORMANCE METRICS",
            "CALCULATING OPTIMIZED SENSITIVITY",
            "PREPARING CALIBRATION CARD"
        ];

        if (overlay) overlay.classList.remove('hidden');
        if (window.NEURAL_AUDIO) window.NEURAL_AUDIO.play('calculate');

        const results = Calculator.compute(state);
        
        // Phase 2: Secure Result Vault
        SecurityEngine.encrypt(results).then(encrypted => {
            localStorage.setItem('xp_sensitivity_profile_last_result_secure', encrypted);
            localStorage.setItem('xp_sensitivity_profile', JSON.stringify(state));

            let stepIdx = 0;
            const interval = setInterval(() => {
                if (stepIdx < steps.length) {
                    if (stepText) stepText.textContent = steps[stepIdx];
                    stepIdx++;
                } else {
                    clearInterval(interval);
                    this.redirect();
                }
            }, 600);
        });
    },

    redirect() {
        const params = new URLSearchParams();
        if (state.lang) params.append('lang', state.lang);
        if (state.vendor && state.vendor !== 'XP CORE') params.append('vendor', state.vendor);
        if (state.logo) params.append('logo', state.logo);
        if (state.bg) params.append('bg', state.bg);
        if (state.bio) params.append('bio', state.bio);
        if (state.msg) params.append('msg', state.msg);
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('promo')) params.append('promo', urlParams.get('promo'));
        
        window.location.href = `result.html?${params.toString()}`;
    },

    saveProfile() {
        localStorage.setItem('xp_sensitivity_profile', JSON.stringify(state));
    },

    loadProfile() {
        const saved = localStorage.getItem('xp_sensitivity_profile');
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(state, loaded);
            
            if (state.brand) {
                this.elements.brand.value = state.brand;
                this.updateSeriesDropdown();
            }
            if (state.series) {
                this.elements.series.value = state.series;
                this.updateModelDropdown();
            }
            if (state.model) {
                this.elements.model.value = state.model;
            }
            
            if (this.elements.ramSlider) {
                this.elements.ramSlider.value = state.ram;
                this.elements.ramLabel.textContent = `${state.ram} GB`;
            }

            this.syncSegmentUI(this.elements.speedBtns, state.speed);
            this.syncSegmentUI(this.elements.clawBtns, state.claw);
        }
    },

    translateUI() {
        if (!window.LANGUAGES || !window.LANGUAGES[state.lang]) return;
        const strings = window.LANGUAGES[state.lang];
        
        document.querySelectorAll('[data-t]').forEach(el => {
            const key = el.dataset.t;
            if (strings[key]) {
                if (el.tagName === 'INPUT' && el.type === 'text') {
                    el.placeholder = strings[key];
                } else {
                    el.textContent = strings[key];
                }
            }
        });

        this.elements.langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.lang);
        });
    },

    initBiometrics() {
        const slider = document.getElementById('handSize');
        const label = document.getElementById('handSizeLabel');
        const gripBtns = document.querySelectorAll('.grip-btn');

        if (slider && label) {
            slider.addEventListener('input', (e) => {
                state.handSize = parseFloat(e.target.value);
                label.textContent = `${state.handSize.toFixed(1)} cm`;
            });
        }

        gripBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                gripBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.grip = btn.dataset.grip;
                if (window.NEURAL_AUDIO) window.NEURAL_AUDIO.play('ping');
            });
        });
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Error', err));
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
function copyAdminLink() {
    const num = document.getElementById('adminPhone').textContent;
    navigator.clipboard.writeText(num).then(() => {
        const btn = document.querySelector('.copy-small-btn');
        const oldText = btn.textContent;
        btn.textContent = "COPIED!";
        setTimeout(() => btn.textContent = oldText, 2000);
    });
}

function toggleHandbook() {
    const m = document.getElementById('handbookModal');
    if (m) m.classList.toggle('hidden');
}
