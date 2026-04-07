const VendorLogic = {
    state: {
        vendorData: null,
        stats: null,
        giveaways: [],
        tournaments: []
    },

    async init() {
        this.populateDevices();
        await this.fetchVendorProfile();
        this.loadMyEvents();
        this.updateUI();
    },

    async loadMyEvents() {
        const list = document.getElementById('myEventsList');
        if (!list) return;

        try {
            const [gRes, sRes] = await Promise.all([
                fetch('/api/vault/giveaways'),
                fetch('/api/vault/tournaments')
            ]);
            
            const giveaways = await gRes.json();
            const scrims = await sRes.json();
            
            const events = [
                ...giveaways.map(g => ({...g, ev_type: 'giveaway'})),
                ...scrims.map(s => ({...s, ev_type: 'scrim'}))
            ];

            if (events.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.7rem;">NO_EVENTS_FOUND</div>`;
                return;
            }

            list.innerHTML = events.map(ev => {
                const isScrim = ev.ev_type === 'scrim';
                const accent = isScrim ? 'var(--accent-secondary)' : 'var(--accent-primary)';
                const title = ev.title || ev.prize_pool || 'Elite Event';
                
                return `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 0.55rem; color: ${accent}; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">${ev.ev_type}</div>
                                <div style="color: white; font-weight: 800; font-size: 0.9rem;">${title}</div>
                            </div>
                            <span style="font-size: 0.6rem; background: rgba(0,255,204,0.1); color: var(--accent-primary); padding: 4px 8px; border-radius: 6px; font-weight: 800;">ACTIVE</span>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-primary" style="flex: 1; padding: 0.6rem; font-size: 0.65rem; background: ${accent}; color: ${isScrim ? 'white' : 'black'};" 
                                onclick="VendorLogic.${isScrim ? 'manageScrim' : 'openWinnerPicker'}('${ev.id}', '${title.replace(/'/g, "\\'")}')">
                                ${isScrim ? 'MANAGE ENTRIES' : 'PICK WINNER'}
                            </button>
                            <button class="btn-secondary" style="width: auto; padding: 0.6rem 1rem; font-size: 0.65rem;" onclick="VendorLogic.archiveEvent('${ev.ev_type}', '${ev.id}')">ARCHIVE</button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.7rem;">SYNC_FAILED</div>`;
        }
    },

    async archiveEvent(type, id) {
        this.showConfirm(`ARCHIVE_${type.toUpperCase()}?`, async () => {
            try {
                const endpoint = type === 'scrim' ? `/api/vault/tournaments/${id}` : `/api/vault/giveaways/${id}`;
                await fetch(endpoint, { method: 'DELETE' });
                window.notify('EVENT_ARCHIVED', 'success');
                this.loadMyEvents();
            } catch (err) {
                window.notify('ARCHIVE_FAILED', 'error');
            }
        });
    },

    async fetchVendorProfile() {
        try {
            const res = await fetch('/api/vault/vendor/profile');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    this.handleLogout();
                }
                throw new Error('NOT_AUTHORIZED');
            }
            this.state.vendorData = await res.json();
            
            // Apply Tier-based styling to all glass-panels
            const tier = this.state.vendorData.tier || 'normal';
            document.querySelectorAll('.glass-panel').forEach((panel, index) => {
                panel.classList.add(`tier-${tier}`);
                // Add staggered entrance animation
                panel.style.animation = `panelSlideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
                panel.style.animationDelay = `${index * 0.1}s`;
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
                const textContainer = welcomeCard.querySelector('.welcome-text');
                if (textContainer) textContainer.prepend(badge);
                welcomeCard.classList.add(`tier-${tier}`);
            }

            const expiryEl = document.getElementById('expiryTimer');
            if (expiryEl && this.state.vendorData.active_until) {
                this.startExpiryTimer(this.state.vendorData.active_until);
            }

            // Load stats if on home/data/stats page
            this.fetchStats();
        } catch (err) {
            console.error('Profile fetch failed:', err);
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

            if (this.state.stats.regions) {
                this.updateHeatmap(this.state.stats.regions);
            }
        } catch (err) {}
    },

    updateHeatmap(regions) {
        const grid = document.querySelector('.heatmap-grid');
        if (!grid) return;

        grid.innerHTML = regions.map(r => `
            <div class="region-row">
                <span class="region-name">${r.name}</span>
                <div class="region-bar-container"><div class="region-bar" style="width: ${r.val}%;"></div></div>
                <span class="region-val">${r.val}%</span>
            </div>
        `).join('');
    },

    populateDevices() {
        const brandSelect = document.getElementById('genBrand');
        if (!brandSelect) return;

        // Try to get devices from window.devices or global devices (from devices.js)
        const deviceList = window.devices || (typeof devices !== 'undefined' ? devices : []);
        
        if (!deviceList || deviceList.length === 0) {
            console.warn('Waiting for device data...');
            setTimeout(() => this.populateDevices(), 200);
            return;
        }

        // Cache it back to window.devices for consistency
        window.devices = deviceList;

        const options = ['<option value="">SELECT BRAND</option>'];
        deviceList.forEach(d => {
            options.push(`<option value="${d.brand}">${d.brand.toUpperCase()}</option>`);
        });
        
        brandSelect.innerHTML = options.join('');
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
        if (!brand || !model) return window.notify('PLEASE_SELECT_DEVICE', 'warning');

        try {
            const res = await fetch('/api/vault/vendor/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand, model, ram,
                    playstyle: document.getElementById('genPlaystyle').value,
                    claw: document.getElementById('genClaw').value
                })
            });
            const data = await res.json();
            if (data.code) {
                this.showResultCard(data.code, brand, model, ram);
                this.fetchStats();
                window.notify('ACCESS_KEY_GENERATED', 'success');
            }
        } catch (err) {
            window.notify('GENERATION_FAILED', 'error');
        }
    },

    showResultCard(code, brand, model, ram) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; text-align: center;">
                <div class="tier-badge badge-${tier}">${tier.toUpperCase()} ACCESS</div>
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
        if (this.currentResultOverlay) this.currentResultOverlay.remove();
        window.notify('COPIED_TO_CLIPBOARD', 'success');
    },

    async createEvent(type) {
        const tier = this.state.vendorData?.tier || 'normal';
        const isScrim = type === 'scrim';
        const accent = isScrim ? 'var(--accent-secondary)' : 'var(--accent-primary)';
        
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 480px; padding: 2.5rem; max-height: 90vh; overflow-y: auto;">
                <div class="section-header">
                    <h2 class="section-title">${type.toUpperCase()}_PROVISIONING</h2>
                    <span class="tier-badge badge-${tier}">${tier}</span>
                </div>
                
                <div class="form-group">
                    <label class="form-label">EVENT TITLE</label>
                    <input type="text" id="eventTitle" class="cyber-input" placeholder="e.g. ${isScrim ? 'PRO SCRIMS' : '1000 DIAMONDS'}">
                </div>

                <div class="form-group">
                    <label class="form-label">PRIZE / DESCRIPTION</label>
                    <textarea id="eventDesc" class="cyber-input" style="height: 80px; resize: none;" placeholder="${isScrim ? 'Prize Pool amount...' : 'Giveaway items...'}"></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">EVENT TYPE</label>
                        <select id="eventMode" class="pro-select">
                            ${isScrim ? `
                                <option value="battle_royale">BATTLE_ROYALE</option>
                                <option value="prize_pool">PRIZE_POOL</option>
                            ` : `
                                <option value="gifting">GIFTING (NEW_GIFT)</option>
                                <option value="redeem_code">REDEEM_CODE</option>
                                <option value="cash_prize">CASH_PRIZE</option>
                                <option value="custom">CUSTOM</option>
                            `}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">END_DATE</label>
                        <input type="datetime-local" id="eventEnd" class="cyber-input">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">${isScrim ? 'TOTAL_SLOTS' : 'MAX_WINNERS'}</label>
                        <input type="number" id="eventLimit" class="cyber-input" value="${isScrim ? '48' : '1'}">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">${isScrim ? 'MAP' : 'REQUIREMENT'}</label>
                        <select id="eventSub" class="pro-select">
                            ${isScrim ? `
                                <option value="bermuda">BERMUDA</option>
                                <option value="purgatory">PURGATORY</option>
                                <option value="kalahari">KALAHARI</option>
                            ` : `
                                <option value="none">NONE</option>
                                <option value="subscriber">SUBSCRIBER</option>
                            `}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">${isScrim ? 'COMM_LINK' : 'TASK_URL'}</label>
                    <input type="text" id="eventLink" class="cyber-input" placeholder="https://...">
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-secondary" style="flex: 1;" onclick="this.closest('.quick-action-overlay').remove()">CANCEL</button>
                    <button class="btn-primary" style="flex: 2; background: ${accent};" onclick="VendorLogic.submitEvent('${type}')">INITIALIZE</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Default end date (24h from now)
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        document.getElementById('eventEnd').value = tomorrow.toISOString().slice(0, 16);
    },

    async submitEvent(type) {
        const isScrim = type === 'scrim';
        const endpoint = isScrim ? '/api/vault/vendor/tournaments' : '/api/vault/vendor/giveaways';
        
        const payload = isScrim ? {
            type: document.getElementById('eventMode').value,
            map_name: document.getElementById('eventSub').value,
            total_slots: parseInt(document.getElementById('eventLimit').value),
            prize_pool: document.getElementById('eventDesc').value,
            start_at: new Date().toISOString(),
            end_at: new Date(document.getElementById('eventEnd').value).toISOString(),
            comm_link: document.getElementById('eventLink').value
        } : {
            type: document.getElementById('eventMode').value,
            title: document.getElementById('eventTitle').value,
            prize_description: document.getElementById('eventDesc').value,
            end_at: new Date(document.getElementById('eventEnd').value).toISOString(),
            max_winners: parseInt(document.getElementById('eventLimit').value)
        };

        if (isScrim && !payload.prize_pool) return window.notify('PRIZE_POOL_REQUIRED', 'warning');
        if (!isScrim && !payload.title) return window.notify('TITLE_REQUIRED', 'warning');

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success || data.id) {
                const overlay = document.querySelector('.quick-action-overlay.active');
                if (overlay) overlay.remove();
                
                // Show a success card with the ID or a general message
                const displayId = data.id || 'SUCCESS';
                this.showEventCard(displayId, type, payload.title || payload.prize_pool, payload);
                window.notify('EVENT_PROVISIONED', 'success');
                
                // Refresh data if needed
                if (window.location.pathname.includes('vendor_dashboard')) {
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                window.notify(data.error || 'CREATION_FAILED', 'error');
            }
        } catch (err) {
            window.notify('CREATION_FAILED', 'error');
        }
    },

    showEventCard(code, type, title, meta = {}) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        const color = type === 'scrim' ? 'var(--accent-secondary)' : 'var(--accent-primary)';

        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; text-align: center;">
                <div class="tier-badge badge-${tier}">${tier.toUpperCase()} PROVISION</div>
                <h3 style="color: white; font-weight: 800; margin-bottom: 0.5rem;">${title}</h3>
                <h2 style="font-family: var(--font-mono); font-size: 1.8rem; letter-spacing: 0.1em; color: ${color}; margin-bottom: 1.5rem;">${code}</h2>
                <button class="btn-primary" style="background: ${color};" onclick="VendorLogic.copyToClipboard('${code}')">COPY & CLOSE</button>
             </div>
         `;
         document.body.appendChild(overlay);
         this.currentResultOverlay = overlay;
     },

     async openWinnerPicker(eventId, eventTitle) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 450px; text-align: center;">
                <div class="section-header"><h2 class="section-title">WINNER_PICKER</h2></div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2rem;">Event: <strong style="color: white;">${eventTitle}</strong></p>
                <div id="pickerAnimation" style="height: 120px; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 1.2rem; color: var(--accent-primary); border: 1px dashed var(--glass-border); border-radius: 16px; margin-bottom: 2rem;">READY_TO_SCAN</div>
                <div id="participantCount" style="font-size: 0.6rem; color: var(--text-muted); margin-bottom: 1rem;">PARTICIPANTS: FETCHING...</div>
                <button class="btn-primary" id="startPickBtn" onclick="VendorLogic.rollWinner('${eventId}')">START RANDOM ROLL</button>
                <button class="btn-secondary" style="margin-top: 1rem;" onclick="VendorLogic.manageScrim('${eventId}', '${eventTitle}')">MANAGE ENTRIES</button>
                <button class="btn-secondary" style="margin-top: 0.5rem; width: 100%;" onclick="this.closest('.quick-action-overlay').remove()">CLOSE</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.loadParticipantCount(eventId);
    },

    async loadParticipantCount(eventId) {
        try {
            const res = await fetch(`/api/vault/vendor/event/participants/giveaway/${eventId}`);
            const data = await res.json();
            this.state.currentParticipants = data.participants || [];
            const el = document.getElementById('participantCount');
            if(el) el.textContent = `PARTICIPANTS: ${this.state.currentParticipants.length}`;
        } catch (err) {}
    },

    async manageScrim(eventId, eventTitle) {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem;">
                <div class="section-header"><h2 class="section-title">MANAGE_EVENT</h2></div>
                <h3 style="color: white; font-weight: 800; margin-bottom: 1.5rem;">${eventTitle}</h3>
                <div id="participantList" style="max-height: 250px; overflow-y: auto; background: rgba(255,255,255,0.03); border-radius: 16px;">
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.7rem;">FETCHING_UPLINK...</div>
                </div>
                <button class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.quick-action-overlay').remove()">BACK</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.loadParticipants('scrim', eventId);
    },

    async loadParticipants(type, eventId) {
        try {
            const res = await fetch(`/api/vault/vendor/event/participants/${type}/${eventId}`);
            const data = await res.json();
            const list = document.getElementById('participantList');
            if (!list) return;
            if (!data.participants || data.participants.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.7rem;">NO_ENTRIES_YET</div>`;
                return;
            }
            list.innerHTML = data.participants.map(p => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                    <span style="color: white; font-weight: 800;">${p.ign}</span>
                    <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 4px 8px; border-radius: 6px; font-size: 0.6rem; cursor: pointer;" onclick="VendorLogic.removeParticipant('${type}', '${eventId}', '${p.uid}')">REMOVE</button>
                </div>
            `).join('');
        } catch (err) {}
    },

    async removeParticipant(type, eventId, userId) {
        this.showConfirm('REMOVE_PARTICIPANT_CONFIRM?', async () => {
            try {
                await fetch('/api/vault/vendor/event/remove-participant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, eventId, userId })
                });
                this.loadParticipants(type, eventId);
                window.notify('PARTICIPANT_REMOVED', 'success');
            } catch (err) {
                window.notify('REMOVE_FAILED', 'error');
            }
        });
    },

     async rollWinner(eventId) {
         if (!this.state.currentParticipants || this.state.currentParticipants.length === 0) {
             return window.notify('NO_PARTICIPANTS_TO_PICK_FROM', 'warning');
         }

         const display = document.getElementById('pickerAnimation');
         const btn = document.getElementById('startPickBtn');
         if (!btn) return;
         btn.disabled = true;
         btn.style.opacity = '0.5';

         window.notify('INITIALIZING_RANDOM_ROLL...', 'info');

         const names = this.state.currentParticipants.map(p => p.ign);
         let count = 0;
         const interval = setInterval(() => {
             display.textContent = names[Math.floor(Math.random() * names.length)];
             display.style.borderColor = count % 2 === 0 ? 'var(--accent-primary)' : 'var(--glass-border)';
             count++;
             if (count > 30) {
                 clearInterval(interval);
                 this.performActualDraw(eventId);
             }
         }, 80);
     },

     async performActualDraw(eventId) {
         try {
             const res = await fetch(`/api/vault/giveaways/${eventId}/draw`, { method: 'POST' });
             const data = await res.json();
             
             if (data.success && data.winners) {
                 this.finalizeWinners(data.winners, data.proof_hash);
             } else {
                 window.notify(data.error || 'DRAW_FAILED', 'error');
             }
         } catch (err) {
             window.notify('DRAW_SYSTEM_OFFLINE', 'error');
         }
     },

     async finalizeWinners(winners, proofHash) {
         const display = document.getElementById('pickerAnimation');
         if (display) display.style.display = 'none';
         
         const card = document.createElement('div');
         card.className = 'gold-winner-card';
         
         const winnersHtml = winners.map(w => `
             <div class="winner-ign" style="font-size: ${winners.length > 1 ? '1.2rem' : '1.8rem'}; margin: 0.5rem 0;">${w.ign || w.user_id}</div>
         `).join('');

         card.innerHTML = `
             <div class="sparkles-container"></div>
             <div style="font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; opacity: 0.8;">OFFICIAL_WINNER${winners.length > 1 ? 'S' : ''}</div>
             <div style="margin: 1rem 0;">${winnersHtml}</div>
             <div style="font-family: var(--font-mono); font-size: 0.5rem; color: gold; opacity: 0.6; margin-top: 1rem; word-break: break-all; padding: 0 1rem;">
                PROOF_HASH: ${proofHash.substring(0, 32)}...
             </div>
             <button class="btn-primary" style="margin-top: 1.5rem; background: #1a1a1a; color: gold; font-size: 0.7rem; padding: 0.8rem;" onclick="VendorLogic.downloadWinnerCard()">DOWNLOAD_CERTIFICATE</button>
         `;
         
         const parent = document.querySelector('#pickerAnimation').parentElement;
         parent.appendChild(card);
         
         const container = card.querySelector('.sparkles-container');
         for(let i=0; i<30; i++) {
             const s = document.createElement('div');
             s.className = 'sparkle';
             s.style.left = Math.random() * 100 + '%';
             s.style.top = Math.random() * 100 + '%';
             s.style.animationDelay = Math.random() * 2 + 's';
             container.appendChild(s);
         }
         
         const pickBtn = document.getElementById('startPickBtn');
         if (pickBtn) pickBtn.style.display = 'none';
         window.notify('DRAW_COMPLETED_SUCCESSFULLY', 'success');
     },

      downloadWinnerCard() {
          const card = document.querySelector('.gold-winner-card');
          if (!card) return;
          
          const text = `
AXP ELITE WINNER CERTIFICATE
---------------------------
EVENT: ${card.querySelector('.winner-event')?.textContent || 'AXP GIVEAWAY'}
WINNER(S): ${Array.from(card.querySelectorAll('.winner-ign')).map(el => el.textContent).join(', ')}
DATE: ${new Date().toLocaleString()}
PROOF_HASH: ${card.textContent.match(/PROOF_HASH: (.*)/)?.[1] || 'N/A'}
---------------------------
VERIFY AT: AXP-SENSITIVITY.COM/WINNERS
          `;
          
          const blob = new Blob([text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `AXP_WINNER_${Date.now()}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          window.notify('CERTIFICATE_DOWNLOADED', 'success');
      },

    async openManualCreator() {
        const tier = this.state.vendorData?.tier || 'normal';
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem;">
                <div class="section-header"><h2 class="section-title">PRO_MANUAL_SUITE</h2></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group"><label class="form-label">X-AXIS</label><input type="number" id="manualX" class="cyber-input" value="85"></div>
                    <div class="form-group"><label class="form-label">Y-AXIS</label><input type="number" id="manualY" class="cyber-input" value="120"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">CURVE</label>
                    <select id="manualCurve" class="cyber-input"><option value="linear">LINEAR</option><option value="dynamic" selected>DYNAMIC</option></select>
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
                document.querySelector('.quick-action-overlay.active').remove();
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
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem;">
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
                document.querySelector('.quick-action-overlay.active').remove();
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
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 600px; padding: 2.5rem;">
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
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: white; font-weight: 800; font-family: var(--font-mono);">${k.lookup_key}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">HITS: ${k.current_usage} / ${k.usage_limit || '∞'}</div>
                    </div>
                    <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 6px 12px; border-radius: 8px; font-size: 0.6rem; cursor: pointer;" onclick="VendorLogic.revokeKey('${k.lookup_key}')">REVOKE</button>
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
            <div class="glass-panel tier-${tier}" style="width: 95%; max-width: 500px; padding: 2.5rem;">
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
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: white; font-weight: 800; font-size: 0.8rem;">${p.preset_name}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">${new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary" style="width: auto; padding: 4px 10px; font-size: 0.6rem;" onclick="VendorLogic.loadPresetToForm('${p.id}')">LOAD</button>
                        <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 4px 8px; border-radius: 6px; font-size: 0.6rem; cursor: pointer;" onclick="VendorLogic.deletePreset('${p.id}')">DEL</button>
                    </div>
                </div>
            `).join('');
            this.state.presets = data;
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
        const pickBtns = Array.from(document.querySelectorAll('.event-btn')).filter(btn => btn.textContent.includes('PICK WINNER'));
        pickBtns.forEach(btn => {
            const card = btn.closest('.event-card') || btn.closest('.glass-panel');
            const title = card.querySelector('.event-title')?.textContent || 'Giveaway';
            btn.onclick = () => this.openWinnerPicker('GIVEAWAY_ID', title);
        });

        const manageBtns = Array.from(document.querySelectorAll('.event-btn')).filter(btn => btn.textContent.includes('MANAGE'));
        manageBtns.forEach(btn => {
            const card = btn.closest('.event-card') || btn.closest('.glass-panel');
            const title = card.querySelector('.event-title')?.textContent || 'Scrim';
            btn.onclick = () => this.manageScrim('SCRIM_ID', title);
        });
    }
};

window.openManualCreator = () => VendorLogic.openManualCreator();
window.openBrandingEditor = () => VendorLogic.openBrandingEditor();
window.openVaultManager = () => VendorLogic.openVaultManager();
window.openMasterPresets = () => VendorLogic.openMasterPresets();
window.updateSeries = () => VendorLogic.updateSeries();
window.updateModels = () => VendorLogic.updateModels();
window.onModelChange = () => VendorLogic.onModelChange();
window.autoGenerate = () => VendorLogic.autoGenerate();
window.createEvent = (type) => VendorLogic.createEvent(type);
window.handleLogout = () => VendorLogic.handleLogout();

document.addEventListener('DOMContentLoaded', () => VendorLogic.init());