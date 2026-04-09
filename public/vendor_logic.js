const VendorLogic = {
    state: {
        vendorData: null,
        stats: null,
        giveaways: [],
        tournaments: []
    },

    async init() {
        this.populateDevices();
        
        // Only enforce vendor auth on dashboard pages
        const isDashboard = window.location.pathname.includes('vendor_');
        if (isDashboard || localStorage.getItem('axp_vendor_token')) {
            try {
                await this.fetchVendorProfile();
                this.loadMyEvents();
                this.initActivityFeed();
            } catch (err) {
                if (isDashboard) this.handleLogout();
            }
        }
        
        this.updateUI();
    },

    initActivityFeed() {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        const events = [
            'USER_ENTRY: @{user} joined SCRIM_7',
            'SYSTEM: Vault key {id} generated',
            'GIVEAWAY: Winner picked for {item}',
            'USER_ENTRY: @{user} entered GIVEAWAY_3',
            'SYSTEM: Brand config updated',
            'USER_ENTRY: @{user} verified elite key'
        ];

        const users = ['Ninja', 'Slayer', 'Ghost', 'Pro_01', 'King', 'Legend', 'Volt'];
        const items = ['1000 DIAMONDS', 'ELITE PASS', 'SKIN PACK', 'CUSTOM KEY'];

        const addActivity = () => {
            const template = events[Math.floor(Math.random() * events.length)];
            const user = users[Math.floor(Math.random() * users.length)];
            const item = items[Math.floor(Math.random() * items.length)];
            const id = Math.random().toString(36).substr(2, 6).toUpperCase();

            const text = template.replace('{user}', user).replace('{item}', item).replace('{id}', id);
            
            const itemEl = document.createElement('div');
            itemEl.style.cssText = `
                font-size: 0.6rem;
                font-family: var(--font-mono);
                color: rgba(255,255,255,0.4);
                padding: 0.5rem 0.75rem;
                background: rgba(255,255,255,0.02);
                border-radius: 8px;
                border-left: 2px solid var(--accent-primary);
                animation: slideInLeft 0.5s ease-out;
            `;
            itemEl.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
            
            feed.prepend(itemEl);
            if (feed.children.length > 5) feed.lastElementChild.remove();
        };

        // Initial items
        for (let i = 0; i < 3; i++) addActivity();
        
        // Randomly add new activity
        setInterval(() => {
            if (Math.random() > 0.7) addActivity();
        }, 3000);
    },

    populateDevices() {
        const brandSelect = document.getElementById('genBrand');
        if (!brandSelect || !window.devices) return;

        brandSelect.innerHTML = '<option value="" disabled selected>SELECT_BRAND</option>' + 
            window.devices.map(b => `<option value="${b.brand}">${b.brand.toUpperCase()}</option>`).join('');
    },

    updateSeries() {
        const brandVal = document.getElementById('genBrand').value;
        const brand = window.devices.find(b => b.brand === brandVal);
        const seriesSelect = document.getElementById('genSeries');
        const modelSelect = document.getElementById('genModel');

        if (brand && seriesSelect) {
            seriesSelect.disabled = false;
            seriesSelect.innerHTML = '<option value="" disabled selected>SELECT_SERIES</option>' + 
                brand.series.map(s => `<option value="${s.name}">${s.name.toUpperCase()}</option>`).join('');
            
            if (modelSelect) {
                modelSelect.disabled = true;
                modelSelect.innerHTML = '<option value="" disabled selected>SELECT_MODEL</option>';
            }
        }
    },

    updateModels() {
        const brandVal = document.getElementById('genBrand').value;
        const seriesVal = document.getElementById('genSeries').value;
        const brand = window.devices.find(b => b.brand === brandVal);
        const series = brand ? brand.series.find(s => s.name === seriesVal) : null;
        const modelSelect = document.getElementById('genModel');

        if (series && modelSelect) {
            modelSelect.disabled = false;
            modelSelect.innerHTML = '<option value="" disabled selected>SELECT_MODEL</option>' + 
                series.models.map(m => `<option value="${m.name}">${m.name.toUpperCase()}</option>`).join('');
        }
    },

    onModelChange() {
        const modelVal = document.getElementById('genModel').value;
        window.notify(`CONFIGURING_TARGET: ${modelVal}`, 'info');
    },

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    },

    handleLogout() {
        localStorage.removeItem('axp_vendor_token');
        document.cookie = "xp_vendor_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = 'index.html';
    },

    showConfirm(title, onConfirm) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 350px; padding: 2.5rem; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin: 0 0 1.5rem 0; font-size: 1rem; font-weight: 900; letter-spacing: 0.05em;">${title}</h3>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-secondary" style="flex: 1;" onclick="this.closest('.quick-action-overlay').remove()">CANCEL</button>
                    <button class="btn-primary" style="flex: 1; background: #ff4444; box-shadow: 0 10px 20px rgba(255,68,68,0.3); color: white;" id="confirmBtn">CONFIRM</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('confirmBtn').onclick = () => {
            overlay.remove();
            onConfirm();
        };
    },

    showResultCard(code, brand, model, tier) {
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.id = 'resultOverlay';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 440px; padding: 2.5rem; text-align: center; background: rgba(10, 15, 25, 0.98); border: 1.5px solid var(--accent-primary);">
                <div id="captureArea" style="background: linear-gradient(135deg, #020617 0%, #0f172a 100%); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 24px; padding: 2.5rem; margin-bottom: 2rem; position: relative; overflow: hidden; text-align: left;">
                    <div style="position: absolute; top:0; left:0; width: 100%; height: 2px; background: var(--accent-primary); opacity: 0.15; animation: scanLineMove 3s linear infinite;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                        <div>
                            <div style="font-family: 'JetBrains Mono'; font-size: 0.7rem; color: var(--accent-primary); letter-spacing: 0.2em; font-weight: 800;">AXP_SIGNATURE</div>
                            <div style="font-size: 0.5rem; color: var(--text-muted); margin-top: 4px;">NEURAL_CALIBRATION_FRAGMENT</div>
                        </div>
                        <div style="background: rgba(0, 242, 254, 0.1); color: var(--accent-primary); font-size: 0.5rem; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.2); font-family: var(--font-mono); font-weight: 800;">VERIFIED</div>
                    </div>

                    <div style="margin-bottom: 2rem;">
                        <div style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; font-weight: 800;">ACCESS_KEY</div>
                        <div style="font-family: var(--font-mono); font-size: 2.25rem; font-weight: 900; color: white; letter-spacing: 0.1em; text-shadow: 0 0 20px rgba(0, 242, 254, 0.4);">${code}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <div style="font-size: 0.5rem; color: var(--text-muted);">ARCHITECTURE</div>
                            <div style="font-size: 0.75rem; font-weight: 800; color: white; margin-top: 2px;">${brand}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.5rem; color: var(--text-muted);">MODEL_HINT</div>
                            <div style="font-size: 0.75rem; font-weight: 800; color: white; margin-top: 2px;">${model}</div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button class="btn-nexus-primary" style="margin: 0; padding: 1rem;" onclick="VendorLogic.copyToClipboard('${code}')">COPY_KEY</button>
                    <button class="btn-nexus-primary" style="margin: 0; padding: 1rem; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);" onclick="VendorLogic.captureAndDownloadResult('${code}')">DOWNLOAD</button>
                </div>
                <button class="btn-secondary" style="margin-top: 1rem; width: 100%; border-radius: 16px; font-size: 0.75rem;" onclick="this.closest('.quick-action-overlay').remove()">CLOSE_TERMINAL</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async captureAndDownloadResult(code) {
        const area = document.getElementById('captureArea');
        if (!area || !window.html2canvas) return window.notify('SYSTEM_NOT_READY', 'error');

        try {
            const canvas = await html2canvas(area, {
                backgroundColor: '#020617',
                scale: 2,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `AXP_KEY_${code}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            window.notify('CARD_EXPORTED_SUCCESSFULLY', 'success');
        } catch (e) {
            window.notify('EXPORT_FAILED', 'error');
        }
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            window.notify('COPIED_TO_CLIPBOARD', 'success');
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            window.notify('COPIED_TO_CLIPBOARD', 'success');
        });
    },

    async autoGenerate() {
        const brand = document.getElementById('genBrand').value;
        const model = document.getElementById('genModel').value;
        const tier = this.state.vendorData?.tier || 'normal';

        if (!brand || !model) return window.notify('SELECT_DEVICE_FIRST', 'warning');

        try {
            const res = await fetch('/api/vault/vendor/generate/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand, model })
            });
            const data = await res.json();
            if (data.code) {
                this.showResultCard(data.code, brand, model, tier);
                window.notify('ACCESS_KEY_GENERATED', 'success');
            } else {
                window.notify(data.error || 'GENERATION_FAILED', 'error');
            }
        } catch (err) {
            window.notify('GENERATION_FAILED', 'error');
        }
    },

    /* Legacy Event & Gamification functions have been removed entirely as part of the Free Fire focus */

    async openManualCreator() {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem; max-height: 90vh; overflow-y: auto;">
                <div class="section-header"><h2 class="section-title">PRO_MANUAL_SUITE</h2></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">X-AXIS</label><input type="number" id="manualX" class="cyber-input" value="85"></div>
                    <div class="form-group"><label class="form-label">Y-AXIS</label><input type="number" id="manualY" class="cyber-input" value="120"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">CURVE</label>
                    <select id="manualCurve" class="pro-select"><option value="linear">LINEAR</option><option value="dynamic" selected>DYNAMIC</option></select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn-secondary" style="flex: 1;" onclick="this.closest('.quick-action-overlay').remove()">CANCEL</button>
                    <button class="btn-primary" style="flex: 2;" onclick="VendorLogic.generateManualCode()">ENCODE_KEY</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async generateManualCode() {
        const payload = {
            x: document.getElementById('manualX').value,
            y: document.getElementById('manualY').value,
            curve: document.getElementById('manualCurve').value
        };
        try {
            const res = await fetch('/api/vault/vendor/generate/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.code) {
                const activeOverlay = document.querySelector('.quick-action-overlay.active');
                if (activeOverlay) activeOverlay.remove();
                this.showResultCard(data.code, 'MANUAL', 'OVERRIDE', 'PRO');
                window.notify('MANUAL_KEY_ENCODED', 'success');
            }
        } catch (err) {
            window.notify('ENCODING_FAILED', 'error');
        }
    },

    async openBrandingEditor() {
        const tier = this.state.vendorData?.tier || 'normal';
        const config = this.state.vendorData?.brand_config || {};
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem; max-height: 90vh; overflow-y: auto;">
                <div class="section-header"><h2 class="section-title">PRO_BRANDING</h2></div>
                <div class="form-group"><label class="form-label">DISPLAY_NAME</label><input type="text" id="brandName" class="cyber-input" value="${this.state.vendorData?.display_name || ''}"></div>
                <div class="form-group"><label class="form-label">LOGO_URL</label><input type="text" id="brandLogo" class="cyber-input" value="${config.logo_url || ''}"></div>
                <div class="form-group"><label class="form-label">SOCIAL_LINK</label><input type="text" id="brandSocial" class="cyber-input" value="${config.social_link || ''}"></div>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn-secondary" style="flex: 1;" onclick="this.closest('.quick-action-overlay').remove()">CANCEL</button>
                    <button class="btn-primary" style="flex: 2;" onclick="VendorLogic.saveBranding()">SAVE_IDENTITY</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async saveBranding() {
        const payload = {
            display_name: document.getElementById('brandName').value,
            brand_config: {
                logo_url: document.getElementById('brandLogo').value,
                social_link: document.getElementById('brandSocial').value
            }
        };
        try {
            const res = await fetch('/api/vault/vendor/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const activeOverlay = document.querySelector('.quick-action-overlay.active');
                if (activeOverlay) activeOverlay.remove();
                await this.fetchVendorProfile();
                window.notify('BRANDING_UPDATED', 'success');
            }
        } catch (err) {
            window.notify('UPDATE_FAILED', 'error');
        }
    },

    async openVaultManager() {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 600px; padding: 2.5rem; max-height: 90vh; overflow-y: auto;">
                <div class="section-header"><h2 class="section-title">VAULT_ACCESS</h2></div>
                <div id="keysList" style="max-height: 400px; overflow-y: auto; background: rgba(255,255,255,0.03); border-radius: 16px;">
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted);">FETCHING_KEYS...</div>
                </div>
                <button class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.quick-action-overlay').remove()">CLOSE</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.loadKeys();
    },

    async loadKeys() {
        try {
            const res = await fetch('/api/vault/vendor/keys');
            const data = await res.json();
            const list = document.getElementById('keysList');
            if (!data.keys || data.keys.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">NO_ACTIVE_KEYS</div>`;
                return;
            }
            list.innerHTML = data.keys.map(k => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: white; font-weight: 800; font-family: var(--font-mono); font-size: 0.9rem; word-break: break-all;">${k.lookup_key}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">HITS: ${k.current_usage} / ${k.usage_limit || '∞'}</div>
                    </div>
                    <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 8px 14px; border-radius: 12px; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(255,68,68,0.2)'" onmouseout="this.style.background='rgba(255,68,68,0.1)'" onclick="VendorLogic.revokeKey('${k.lookup_key}')">REVOKE</button>
                </div>
            `).join('');
        } catch (err) {}
    },

    async revokeKey(key) {
        this.showConfirm('REVOKE_ACCESS_KEY?', async () => {
            try {
                await fetch(`/api/vault/vendor/keys/${key}`, { method: 'DELETE' });
                this.loadKeys();
                window.notify('KEY_REVOKED', 'success');
            } catch (err) {
                window.notify('REVOKE_FAILED', 'error');
            }
        });
    },

    async openMasterPresets() {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem; max-height: 90vh; overflow-y: auto;">
                <div class="section-header">
                    <h2 class="section-title">MASTER_PRESETS</h2>
                    <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem; font-size: 0.7rem;" onclick="VendorLogic.saveCurrentAsPreset()">SAVE_CURRENT</button>
                </div>
                <div id="presetsList" style="max-height: 300px; overflow-y: auto; background: rgba(255,255,255,0.03); border-radius: 16px;">
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted);">FETCHING_PRESETS...</div>
                </div>
                <button class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.quick-action-overlay').remove()">CLOSE</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.loadPresets();
    },

    async loadPresets() {
        try {
            const res = await fetch('/api/vault/vendor/presets');
            const data = await res.json();
            const list = document.getElementById('presetsList');
            if (!data || data.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">NO_SAVED_PRESETS</div>`;
                return;
            }
            list.innerHTML = data.map(p => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: white; font-weight: 800; font-family: var(--font-mono); font-size: 0.85rem; word-break: break-all;">${p.name || (p.brand + ' ' + p.model)}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">${p.brand} ${p.model} · ${p.ram}GB</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary" style="width: auto; padding: 6px 12px; font-size: 0.65rem;" onclick="VendorLogic.loadPresetById('${p._id}')">LOAD</button>
                        <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 6px; border-radius: 8px; cursor: pointer;" onclick="VendorLogic.deletePreset('${p._id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {}
    },

    async saveCurrentAsPreset() {
        const name = prompt('ENTER_PRESET_NAME:');
        if (!name) return;

        const config = {
            brand: document.getElementById('genBrand').value,
            model: document.getElementById('genModel').value,
            ram: document.getElementById('genRam').value,
            playstyle: document.getElementById('genPlaystyle').value,
            claw: document.getElementById('genClaw').value
        };

        try {
            const res = await fetch('/api/vault/vendor/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, config })
            });
            if (res.ok) {
                window.notify('PRESET_SAVED', 'success');
                this.loadPresets();
            }
        } catch (err) {
            window.notify('SAVE_FAILED', 'error');
        }
    },

    loadPresetToForm(id) {
        const preset = this.state.presets.find(p => String(p.id) === String(id));
        if (!preset) return;

        const config = preset.config_json;
        if (config.brand) {
            const brandEl = document.getElementById('genBrand');
            brandEl.value = config.brand;
            this.updateSeries();
            
            // Need a slight delay to allow DOM to update options
            setTimeout(() => {
                if (config.series) document.getElementById('genSeries').value = config.series;
                this.updateModels();
                
                setTimeout(() => {
                    if (config.model) document.getElementById('genModel').value = config.model;
                    if (config.ram) {
                        document.getElementById('genRam').value = config.ram;
                        document.getElementById('ramVal').textContent = config.ram + ' GB';
                    }
                    if (config.playstyle) document.getElementById('genPlaystyle').value = config.playstyle;
                    if (config.claw) document.getElementById('genClaw').value = config.claw;
                    
                    window.notify('PRESET_LOADED', 'info');
                    const overlay = document.querySelector('.quick-action-overlay.active');
                    if (overlay) overlay.remove();
                }, 50);
            }, 50);
        }
    },

    async deletePreset(id) {
        this.showConfirm('DELETE_PRESET_CONFIRM?', async () => {
            try {
                await fetch(`/api/vault/vendor/presets/${id}`, { method: 'DELETE' });
                this.loadPresets();
                window.notify('PRESET_DELETED', 'success');
            } catch (err) {
                window.notify('DELETE_FAILED', 'error');
            }
        });
    },

    showConfirm(message, onConfirm) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '11000';
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 320px; text-align: center; padding: 2rem;">
                <div style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; letter-spacing: 0.1em; margin-bottom: 1rem;">SYSTEM_CONFIRMATION</div>
                <p style="color: white; font-size: 0.85rem; margin-bottom: 2rem;">${message}</p>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn-secondary" style="flex: 1; padding: 0.75rem;" onclick="this.closest('.quick-action-overlay').remove()">NO</button>
                    <button class="btn-primary" id="confirmBtn" style="flex: 1; padding: 0.75rem;">YES</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirmBtn').onclick = () => {
            overlay.remove();
            onConfirm();
        };
    },

    handleLogout() {
        localStorage.removeItem('axp_vendor_token');
        window.location.href = 'index.html';
    },

    updateUI() {
        // Fix for static elements in HTML that might need handlers
        document.querySelectorAll('[data-action]').forEach(el => {
            const action = el.getAttribute('data-action');
            if (this[action]) el.onclick = () => this[action]();
        });
    }
};

// Global Quick Access for UI toggles
const VendorUI = {
    toggleQuickActions(show) {
        const overlay = document.querySelector('.quick-action-overlay');
        if (show) {
            // Show action selector
            const tier = VendorLogic.state.vendorData?.tier || 'normal';
            const selector = document.createElement('div');
            selector.className = 'quick-action-overlay active';
            selector.style.zIndex = '10000';
            selector.innerHTML = `
                <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; padding: 2.5rem;">
                    <div class="section-header"><h2 class="section-title">QUICK_COMMANDS</h2></div>
                    <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-primary" onclick="this.closest('.quick-action-overlay').remove(); VendorLogic.createEvent('giveaway')">🎁 NEW_GIVEAWAY</button>
                        <button class="btn-primary" style="background: var(--accent-secondary);" onclick="this.closest('.quick-action-overlay').remove(); VendorLogic.createEvent('scrim')">🏆 NEW_SCRIM</button>
                        <button class="btn-secondary" onclick="this.closest('.quick-action-overlay').remove(); VendorLogic.openManualCreator()">⚙️ MANUAL_OVERRIDE</button>
                        <button class="btn-secondary" style="border-color: rgba(255,68,68,0.3); color: #ff4444 !important;" onclick="VendorLogic.handleLogout()">🚀 TERMINATE_SESSION</button>
                    </div>
                    <button class="btn-secondary" style="margin-top: 1.5rem; width: 100%;" onclick="this.closest('.quick-action-overlay').remove()">DISMISS</button>
                </div>
            `;
            document.body.appendChild(selector);
        }
    }
};

window.updateSeries = () => VendorLogic.updateSeries();
window.updateModels = () => VendorLogic.updateModels();
window.onModelChange = () => VendorLogic.onModelChange();
window.autoGenerate = () => VendorLogic.autoGenerate();
window.openManualCreator = () => VendorLogic.openManualCreator();
window.openBrandingEditor = () => VendorLogic.openBrandingEditor();
window.openVaultManager = () => VendorLogic.openVaultManager();
window.openMasterPresets = () => VendorLogic.openMasterPresets();
window.handleLogout = () => VendorLogic.handleLogout();

document.addEventListener('DOMContentLoaded', () => VendorLogic.init());