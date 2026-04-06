const VendorLogic = {
    state: {
        vendorData: null,
        stats: null,
        giveaways: [],
        tournaments: []
    },

    async init() {
        await this.fetchVendorProfile();
        this.populateDevices();
        this.updateUI();
    },

    async fetchVendorProfile() {
        try {
            const res = await fetch('/api/vault/vendor/profile');
            if (!res.ok) throw new Error('NOT_AUTHORIZED');
            this.state.vendorData = await res.json();
            
            // Apply Tier-based styling to all glass-panels
            const tier = this.state.vendorData.tier || 'normal';
            document.querySelectorAll('.glass-panel').forEach(panel => {
                panel.classList.add(`tier-${tier}`);
            });
            
            // Update profile elements across pages
            const nameEl = document.getElementById('welcomeName') || document.getElementById('vendorName');
            if (nameEl) nameEl.textContent = this.state.vendorData.display_name || 'Creator';
            
            const titleEl = document.getElementById('vendorTitle');
            if (titleEl) titleEl.textContent = (this.state.vendorData.display_name || 'CREATOR').toUpperCase();

            // Add tier badge to welcome card or settings
            const welcomeCard = document.querySelector('.welcome-card');
            if (welcomeCard) {
                const badge = document.createElement('div');
                badge.className = `tier-badge badge-${tier}`;
                badge.textContent = tier;
                welcomeCard.querySelector('.welcome-text').prepend(badge);
                welcomeCard.classList.add(`tier-${tier}`);
            }

            const expiryEl = document.getElementById('expiryTimer');
            if (expiryEl && this.state.vendorData.expiry_date) {
                this.startExpiryTimer(this.state.vendorData.expiry_date);
            }

            // Load stats if on home/data/stats page
            this.fetchStats();
        } catch (err) {
            console.error('Profile fetch failed:', err);
            if (window.location.pathname.includes('vendor_')) {
                // window.location.href = 'admin.html'; // Redirect to login if not authorized
            }
        }
    },

    startExpiryTimer(expiryDate) {
        const timer = () => {
            const now = new Date().getTime();
            const distance = new Date(expiryDate).getTime() - now;
            const expiryEl = document.getElementById('expiryTimer');
            if (!expiryEl) return;

            if (distance < 0) {
                expiryEl.textContent = "EXPIRED";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            expiryEl.textContent = `${days}d ${hours}h ${minutes}m`;
        };
        timer();
        setInterval(timer, 60000);
    },

    async fetchStats() {
        try {
            const res = await fetch('/api/vault/vendor/stats');
            this.state.stats = await res.json();
            
            const codesEl = document.getElementById('statCodes');
            const hitsEl = document.getElementById('statHits');
            if (codesEl) codesEl.textContent = this.state.stats.total_codes || '0';
            if (hitsEl) hitsEl.textContent = this.state.stats.total_hits || '0';
        } catch (err) {}
    },

    populateDevices() {
        const brandSelect = document.getElementById('genBrand');
        if (!brandSelect || !window.devices) return;

        brandSelect.innerHTML = '<option value="">SELECT BRAND</option>' + 
            window.devices.map(d => `<option value="${d.brand}">${d.brand.toUpperCase()}</option>`).join('');
    },

    updateSeries() {
        const brand = document.getElementById('genBrand').value;
        const seriesSelect = document.getElementById('genSeries');
        const modelSelect = document.getElementById('genModel');
        
        seriesSelect.disabled = !brand;
        modelSelect.disabled = true;
        modelSelect.innerHTML = '<option value="">SELECT MODEL</option>';

        if (!brand) return;

        const device = window.devices.find(d => d.brand === brand);
        seriesSelect.innerHTML = '<option value="">SELECT SERIES</option>' + 
            device.series.map(s => `<option value="${s.name}">${s.name.toUpperCase()}</option>`).join('');
    },

    updateModels() {
        const brand = document.getElementById('genBrand').value;
        const seriesName = document.getElementById('genSeries').value;
        const modelSelect = document.getElementById('genModel');

        modelSelect.disabled = !seriesName;
        if (!seriesName) return;

        const device = window.devices.find(d => d.brand === brand);
        const series = device.series.find(s => s.name === seriesName);
        
        modelSelect.innerHTML = '<option value="">SELECT MODEL</option>' + 
            series.models.map(m => `<option value="${m.name}" data-ram="${m.ram}">${m.name.toUpperCase()}</option>`).join('');
    },

    onModelChange() {
        const modelSelect = document.getElementById('genModel');
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        const ram = selectedOption.getAttribute('data-ram');
        const ramVal = document.getElementById('ramVal');
        const ramInput = document.getElementById('genRam');
        
        if (ram && ramVal && ramInput) {
            ramInput.value = ram;
            ramVal.textContent = ram + ' GB';
        }
    },

    async autoGenerate() {
        const brand = document.getElementById('genBrand').value;
        const model = document.getElementById('genModel').value;
        const ram = document.getElementById('genRam').value;
        if (!brand || !model) return alert('PLEASE_SELECT_DEVICE');

        try {
            const res = await fetch('/api/vault/vendor/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand,
                    model,
                    ram,
                    playstyle: document.getElementById('genPlaystyle').value,
                    claw: document.getElementById('genClaw').value
                })
            });
            const data = await res.json();
            if (data.code) {
                this.showResultCard(data.code, brand, model, ram);
                this.fetchStats();
            }
        } catch (err) {
            alert('GENERATION_FAILED');
        }
    },

    showResultCard(code, brand, model, ram) {
        const tier = this.state.vendorData.tier || 'normal';
        // Create a professional overlay for the generated code
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; text-align: center;">
                <div class="tier-badge badge-${tier}">${tier} ACCESS</div>
                <div style="font-size: 0.6rem; color: var(--accent-primary); font-weight: 800; letter-spacing: 0.2em; margin-bottom: 1rem;">ACCESS_KEY_GENERATED</div>
                <h2 style="font-family: var(--font-mono); font-size: 1.8rem; letter-spacing: 0.1em; color: white; margin-bottom: 1.5rem;">${code}</h2>
                <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">DEVICE</span>
                        <span style="color: white; font-weight: 800;">${brand} ${model}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">MEMORY</span>
                        <span style="color: white; font-weight: 800;">${ram} GB</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="VendorLogic.copyToClipboard('${code}')">COPY & CLOSE</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.currentResultOverlay = overlay;
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        if (this.currentResultOverlay) {
            this.currentResultOverlay.remove();
        }
        alert('COPIED_TO_CLIPBOARD');
    },

    async createEvent(type) {
        const tier = this.state.vendorData.tier || 'normal';
        // Detailed Event Creation Prompt
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        const isScrim = type === 'scrim';
        const accent = isScrim ? 'var(--accent-secondary)' : 'var(--accent-primary)';

        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 480px; padding: 2.5rem;">
                <div class="section-header">
                    <h2 class="section-title">${type.toUpperCase()}_PROVISIONING</h2>
                    <span class="tier-badge badge-${tier}">${tier}</span>
                </div>
                
                <div class="form-group">
                    <label class="form-label">EVENT TITLE</label>
                    <input type="text" id="eventTitle" class="cyber-input" placeholder="e.g. ${isScrim ? 'PRO SCRIMS BERMUDA' : '1000 DIAMONDS MEGA'}">
                </div>

                ${isScrim ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">TEAM_MODE</label>
                        <select id="eventMode" class="cyber-input">
                            <option value="solo">SOLO</option>
                            <option value="duo">DUO</option>
                            <option value="squad" selected>SQUAD</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">MAP</label>
                        <select id="eventMap" class="cyber-input">
                            <option value="bermuda">BERMUDA</option>
                            <option value="purgatory">PURGATORY</option>
                            <option value="kalahari">KALAHARI</option>
                        </select>
                    </div>
                </div>
                ` : `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">GIVEAWAY_TYPE</label>
                        <select id="eventMode" class="cyber-input">
                            <option value="diamonds">DIAMONDS</option>
                            <option value="skin">ELITE_SKIN</option>
                            <option value="cash">CASH_PRIZE</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">DURATION</label>
                        <select id="eventDuration" class="cyber-input">
                            <option value="1h">1 HOUR</option>
                            <option value="24h">24 HOURS</option>
                            <option value="7d">7 DAYS</option>
                        </select>
                    </div>
                </div>
                `}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">${isScrim ? 'SLOTS' : 'WINNERS'}</label>
                        <input type="number" id="eventLimit" class="cyber-input" value="${isScrim ? '48' : '1'}">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">REQUIREMENT</label>
                        <select id="eventReq" class="cyber-input">
                            <option value="none">NONE</option>
                            <option value="follow">FOLLOW_SOCIAL</option>
                            <option value="sub">SUBSCRIBER</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">${isScrim ? 'ROOM_ID / LINK' : 'TASK_URL'}</label>
                    <input type="text" id="eventLink" class="cyber-input" placeholder="https://...">
                </div>

                <div class="form-group">
                    <label class="form-label">PRIZE_POOL / DESCRIPTION</label>
                    <textarea id="eventDesc" class="cyber-input" style="height: 60px; resize: none; background-image:none;" placeholder="Enter details..."></textarea>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-secondary" style="flex: 1;" onclick="this.closest('.quick-action-overlay').remove()">CANCEL</button>
                    <button class="btn-primary" style="flex: 2; background: ${accent};" onclick="VendorLogic.submitEvent('${type}')">INITIALIZE</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async submitEvent(type) {
        const payload = {
            type,
            title: document.getElementById('eventTitle').value,
            limit: document.getElementById('eventLimit').value,
            req: document.getElementById('eventReq').value,
            desc: document.getElementById('eventDesc').value,
            mode: document.getElementById('eventMode').value,
            link: document.getElementById('eventLink').value,
            duration: document.getElementById('eventDuration')?.value || null,
            map: document.getElementById('eventMap')?.value || null
        };

        if (!payload.title) return alert('TITLE_REQUIRED');

        try {
            const res = await fetch(`/api/vault/vendor/event/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.event_code) {
                document.querySelector('.quick-action-overlay.active').remove();
                this.showEventCard(data.event_code, type, payload.title, payload);
            }
        } catch (err) {
            alert('CREATION_FAILED');
        }
    },

    showEventCard(code, type, title, meta = {}) {
        const tier = this.state.vendorData.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        const isScrim = type === 'scrim';
        const color = isScrim ? 'var(--accent-secondary)' : 'var(--accent-primary)';

        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; text-align: center;">
                <div class="tier-badge badge-${tier}">${tier} PROVISION</div>
                <div style="font-size: 0.6rem; color: ${color}; font-weight: 800; letter-spacing: 0.2em; margin-bottom: 1rem;">${type.toUpperCase()}_PROVISIONED</div>
                <h3 style="color: white; font-weight: 800; margin-bottom: 0.5rem;">${title}</h3>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); margin-bottom: 1.5rem; display: flex; justify-content: center; gap: 10px;">
                    ${meta.mode ? `<span>MODE: ${meta.mode.toUpperCase()}</span>` : ''}
                    ${meta.map ? `<span>MAP: ${meta.map.toUpperCase()}</span>` : ''}
                </div>
                <h2 style="font-family: var(--font-mono); font-size: 1.8rem; letter-spacing: 0.1em; color: ${color}; margin-bottom: 1.5rem;">${code}</h2>
                <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 1.5rem;">Share this passkey with your community.</p>
                <button class="btn-primary" style="background: ${color};" onclick="VendorLogic.copyToClipboard('${code}')">COPY & CLOSE</button>
             </div>
         `;
         document.body.appendChild(overlay);
         this.currentResultOverlay = overlay;
     },

     async openWinnerPicker(eventId, eventTitle) {
        const tier = this.state.vendorData.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 450px; text-align: center;">
                <div class="section-header">
                    <h2 class="section-title">WINNER_PICKER</h2>
                    <span class="tier-badge badge-${tier}">${tier}</span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2rem;">Picking random winner for:<br><strong style="color: white;">${eventTitle}</strong></p>
                
                <div id="pickerAnimation" style="height: 120px; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 1.2rem; color: var(--accent-primary); border: 1px dashed var(--glass-border); border-radius: 16px; margin-bottom: 2rem; overflow: hidden;">
                    READY_TO_SCAN
                </div>

                <button class="btn-primary" id="startPickBtn" onclick="VendorLogic.rollWinner('${eventId}')">START RANDOM ROLL</button>
                <button class="btn-secondary" style="margin-top: 1rem;" onclick="this.closest('.quick-action-overlay').remove()">CLOSE</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async manageScrim(eventId, eventTitle) {
        const tier = this.state.vendorData.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem;">
                <div class="section-header">
                    <h2 class="section-title">MANAGE_SCRIM</h2>
                    <span class="tier-badge badge-${tier}">${tier}</span>
                </div>
                <h3 style="color: white; font-weight: 800; margin-bottom: 1.5rem;">${eventTitle}</h3>
                
                <div style="background: rgba(255,255,255,0.03); border-radius: 16px; overflow: hidden; margin-bottom: 2rem;">
                    <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; font-size: 0.6rem; color: var(--text-muted); font-weight: 800;">
                        <span>PARTICIPANT</span>
                        <span>GAME_ID</span>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; font-size: 0.75rem;">
                            <span style="color: white; font-weight: 800;">SHADOW_X</span>
                            <span style="color: var(--accent-secondary); font-family: var(--font-mono);">#2849102</span>
                        </div>
                        <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; font-size: 0.75rem;">
                            <span style="color: white; font-weight: 800;">AXP_BEAST</span>
                            <span style="color: var(--accent-secondary); font-family: var(--font-mono);">#9921044</span>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button class="btn-secondary" onclick="VendorLogic.copyToClipboard('ROOM_ID: 28491 | PASS: 1234')">COPY ROOM INFO</button>
                    <button class="btn-primary" style="background: #ff4444; box-shadow: none;" onclick="alert('SCRIM_TERMINATED')">CLOSE LOBBY</button>
                </div>
                <button class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.quick-action-overlay').remove()">BACK</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

     async rollWinner(eventId) {
         const display = document.getElementById('pickerAnimation');
         const btn = document.getElementById('startPickBtn');
         btn.disabled = true;
         btn.style.opacity = '0.5';

         // Fake animation for professional feel
         const names = ['USER_#2849', 'PLAYER_PRO_1', 'SHADOW_X', 'NINJA_FF', 'AXP_BEAST', 'ELITE_MOBI'];
         let count = 0;
         const interval = setInterval(() => {
             display.textContent = names[Math.floor(Math.random() * names.length)];
             display.style.borderColor = count % 2 === 0 ? 'var(--accent-primary)' : 'var(--glass-border)';
             count++;
             if (count > 20) {
                 clearInterval(interval);
                 this.finalizeWinner(eventId);
             }
         }, 100);
     },

     async finalizeWinner(eventId) {
         try {
             const winner = "USER_#7721_AXP"; // Mocked
             const display = document.getElementById('pickerAnimation');
             display.innerHTML = `
                 <div>
                     <div style="font-size: 0.6rem; color: var(--text-muted);">WINNER_SELECTED</div>
                     <div style="font-size: 1.5rem; font-weight: 900; color: #ffd700;">${winner}</div>
                 </div>
             `;
             display.style.borderColor = '#ffd700';
             display.style.background = 'rgba(255, 215, 0, 0.05)';
             alert(`WINNER_PICKED: ${winner}`);
         } catch (err) {
             alert('PICK_FAILED');
         }
     },

    handleLogout() {
        localStorage.removeItem('axp_vendor_token');
        window.location.href = 'index.html';
    },

    updateUI() {
        // Page specific initializations
    }
};

// Global helpers for inline onclicks
window.updateSeries = () => VendorLogic.updateSeries();
window.updateModels = () => VendorLogic.updateModels();
window.onModelChange = () => VendorLogic.onModelChange();
window.autoGenerate = () => VendorLogic.autoGenerate();
window.createEvent = (type) => VendorLogic.createEvent(type);
window.handleLogout = () => VendorLogic.handleLogout();

document.addEventListener('DOMContentLoaded', () => VendorLogic.init());
