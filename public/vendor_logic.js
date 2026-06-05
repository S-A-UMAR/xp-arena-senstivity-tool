const VendorLogic = {
    state: {
        vendorData: null,
        stats: null,
        presets: [],
        expiryInterval: null,
        diagnosticData: null,
        lastGeneratedCard: null
    },

    async init() {
        // Robust device population
        this.populateDevices();
        
        // Only enforce vendor auth on dashboard pages
        const isDashboard = window.location.pathname.includes('vendor_');
        if (isDashboard || NexusAuth.isAuthenticated()) {
            try {
                await this.fetchVendorProfile();
                this.initActivityFeed();
            } catch (err) {
                console.warn('VENDOR_INIT_ERR:', err);
                if (isDashboard) this.handleLogout();
            }
        }
        
        this.updateUI();
        this.initMetaStatus();
    },

    populateDevices(retryCount = 0) {
        const brands = window.devices;
        const brandSel  = document.getElementById('genBrand');
        const seriesSel = document.getElementById('genSeries');
        const modelSel  = document.getElementById('genModel');

        if (!brandSel) return; // Not on the hub page

        if (!brands || !brands.length) {
            if (retryCount < 10) {
                console.warn(`RETRYING_DEVICE_POPULATION: ATTEMPT_${retryCount + 1}`);
                setTimeout(() => this.populateDevices(retryCount + 1), 500);
            } else {
                console.error('DEVICE_ARCHITECTURE_LOAD_FAILED');
            }
            return;
        }

        brandSel.innerHTML = '<option value="" disabled selected>SELECT_BRAND</option>' +
            brands.map(b => `<option value="${b.brand}">${b.brand.toUpperCase()}</option>`).join('');
        brandSel.disabled = false;

        brandSel.onchange = () => {
            const bd = brands.find(b => b.brand === brandSel.value);
            seriesSel.innerHTML = '<option value="" disabled selected>SELECT_SERIES</option>';
            if (bd && bd.series) {
                bd.series.forEach((s, i) => seriesSel.innerHTML += `<option value="${i}">${s.name.toUpperCase()}</option>`);
                seriesSel.disabled = false;
            } else { seriesSel.disabled = true; }
            modelSel.innerHTML = '<option value="" disabled selected>SELECT_MODEL</option>';
            modelSel.disabled = true;
        };

        seriesSel.onchange = () => {
            const bd = brands.find(b => b.brand === brandSel.value);
            const sd = bd && bd.series ? bd.series[seriesSel.value] : null;
            modelSel.innerHTML = '<option value="" disabled selected>SELECT_MODEL</option>';
            if (sd && sd.models) {
                sd.models.forEach(m => modelSel.innerHTML += `<option value="${m.name}" data-ram="${m.ram}">${m.name.toUpperCase()}</option>`);
                modelSel.disabled = false;
            } else { modelSel.disabled = true; }
        };

        console.log('DEVICE_ARCHITECTURE_READY');
    },

    initMetaStatus() {
        const badges = document.querySelectorAll('.badge-meta-sync');
        badges.forEach(b => {
            b.textContent = 'SYSTEM_SYNC: ACTIVE';
            b.classList.add('active');
        });
    },

    async fetchVendorProfile() {
        const res = await NexusAuth.fetch('/api/vault/vendor/profile');
        if (!res.ok) throw new Error(`PROFILE_FETCH_FAILED: ${res.status}`);
        const data = await res.json();
        this.state.vendorData = data;

        // Apply Tier Theme
        if (data.tier) {
            document.body.classList.add(`tier-${data.tier}`);
        }

        // Update welcome name
        const nameEl = document.getElementById('welcomeName');
        if (nameEl) nameEl.textContent = data.display_name || data.vendor_id || 'CREATOR';

        // Wire expiry countdown timer
        const timerEl = document.getElementById('expiryTimer');
        if (timerEl) {
            if (this.state.expiryInterval) clearInterval(this.state.expiryInterval);
            if (data.seconds_left === null || data.seconds_left === undefined) {
                timerEl.textContent = 'NO EXPIRY';
            } else {
                const tick = () => {
                    const s = Math.max(0, data.seconds_left - Math.floor((Date.now() - this._profileFetchedAt) / 1000));
                    const d = Math.floor(s / 86400);
                    const h = Math.floor((s % 86400) / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    timerEl.textContent = `${d}D ${h}H ${m}M`;
                    if (s <= 0) { timerEl.textContent = 'EXPIRED'; clearInterval(this.state.expiryInterval); }
                };
                this._profileFetchedAt = Date.now();
                tick();
                this.state.expiryInterval = setInterval(tick, 60000);
            }
        }

        return data;
    },

    initActivityFeed() {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        // Clear "ESTABLISHING_CONNECTION" placeholder
        feed.innerHTML = '';

        const events = [
            'CALIBRATION_SYNC: Node {id} established',
            'SYSTEM: Vault key {id} provisioned',
            'FABRICATION: New preset {item} saved',
            'SYSTEM: Brand architecture updated',
            'UPLINK: Verified premium access key',
            'DIAGNOSTIC: Calibration complete for model {id}'
        ];

        const users = ['Ninja', 'Slayer', 'Ghost', 'Pro_01', 'King', 'Legend', 'Volt'];
        const items = ['SPEED_PACK', 'PRECISION_V4', 'BALANCED_SET', 'CYBER_AXP'];

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
                margin-bottom: 0.5rem;
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



    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    },

    handleLogout() {
        NexusAuth.logout();
    },


    showResultCard(code, brand, model, tier) {
        this.state.lastGeneratedCard = { code, brand, model, tier };
        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.id = 'resultOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(25px); padding: 20px;
        `;
        
        overlay.innerHTML = `
            <style>
                @keyframes floatGiftCard {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(0.5deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                @keyframes goldPulse {
                    0% { box-shadow: 0 0 12px rgba(251, 191, 36, 0.2), inset 0 0 8px rgba(251, 191, 36, 0.1); }
                    100% { box-shadow: 0 0 28px rgba(251, 191, 36, 0.65), inset 0 0 16px rgba(251, 191, 36, 0.3); }
                }
                @keyframes keyRotate {
                    0% { transform: scale(1) rotate(0deg); }
                    50% { transform: scale(1.1) rotate(5deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes shimmerGold {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
            <div class="glass-panel" style="width: min(90vw, 360px); text-align: center; background: transparent; border: none; box-shadow: none;">
                <div id="captureArea" class="holo-card-vertical" onmousemove="VendorLogic.handleHoloMove(event, this)" style="
                    background: linear-gradient(135deg, #070d19 0%, #0c152b 50%, #040812 100%);
                    border: 2px solid #fbbf24;
                    border-radius: 24px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(251, 191, 36, 0.25);
                    transition: transform 0.1s ease-out;
                    animation: floatGiftCard 4s ease-in-out infinite;
                ">
                    <!-- Premium Shimmer & Micro-pattern Backgrounds -->
                    <div style="position: absolute; inset: 0; opacity: 0.04; background-image: radial-gradient(#fbbf24 1px, transparent 1px); background-size: 15px 15px;"></div>
                    <div style="position: absolute; inset: 0; opacity: 0.15; background: linear-gradient(90deg, rgba(251,191,36,0) 0%, rgba(251,191,36,0.15) 50%, rgba(251,191,36,0) 100%); background-size: 200% 100%; animation: shimmerGold 8s infinite linear; pointer-events: none;"></div>
                    
                    <!-- Top Ribbon / Voucher Badge -->
                    <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2; border-bottom: 1px solid rgba(251,191,36,0.15); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                        <div style="font-family: var(--font-mono); font-size: 0.55rem; color: #fbbf24; letter-spacing: 0.2em; font-weight: 900; display: flex; align-items: center; gap: 4px;">
                            <span>🎁</span> AXP_GIFT_REWARD
                        </div>
                        <div style="font-size: 0.5rem; color: rgba(255, 255, 255, 0.4); font-family: var(--font-mono); background: rgba(251,191,36,0.1); padding: 2px 8px; border-radius: 50px; border: 1px solid rgba(251,191,36,0.2); font-weight: 800;">
                            [LEGENDARY_KEY]
                        </div>
                    </div>

                    <!-- Center Section with Key and Code -->
                    <div style="display: flex; align-items: center; gap: 1.25rem; flex: 1; z-index: 2; margin: 0.5rem 0 1rem 0; text-align: left;">
                        <!-- Key Icon Ring Wrapper -->
                        <div style="width: 58px; height: 58px; border: 2px dashed rgba(251, 191, 36, 0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); animation: goldPulse 2s infinite alternate; flex-shrink: 0;">
                            <div style="font-size: 1.8rem; animation: keyRotate 4s ease-in-out infinite;">🔑</div>
                        </div>
                        <div>
                            <div style="font-size: 0.45rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 3px; font-weight: 800;">YOUR ACCESS TOKEN</div>
                            <div style="font-family: var(--font-mono); font-size: 1.45rem; font-weight: 950; color: #ffffff; letter-spacing: 0.02em; line-height: 1.1; text-shadow: 0 0 20px rgba(251,191,36,0.8), 0 0 5px rgba(255,255,255,0.3);">
                                ${code}
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Specs Section -->
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.85rem; z-index: 2;">
                        <div style="text-align: left;">
                            <div style="font-size: 0.38rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.05em;">ARCH</div>
                            <div style="font-size: 0.6rem; font-weight: 900; color: #ffffff; text-transform: uppercase; margin-top: 2px;">${brand}</div>
                        </div>
                        <div style="text-align: left; padding: 0 10px;">
                            <div style="font-size: 0.38rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.05em;">MODEL</div>
                            <div style="font-size: 0.6rem; font-weight: 900; color: #ffffff; text-transform: uppercase; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px;">${model.substring(0, 15)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.38rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.05em;">STATUS</div>
                            <div style="font-size: 0.58rem; font-weight: 900; color: #10b981; text-shadow: 0 0 8px rgba(16,185,129,0.4); text-transform: uppercase; margin-top: 2px;">VERIFIED</div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <button class="btn-cta" style="
                        padding: 0.85rem;
                        border-radius: 14px;
                        font-size: 0.72rem;
                        font-weight: 950;
                        background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
                        color: #000;
                        border: none;
                        letter-spacing: 0.05em;
                        box-shadow: 0 8px 20px rgba(217, 119, 6, 0.35);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 25px rgba(217, 119, 6, 0.55)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 8px 20px rgba(217, 119, 6, 0.35)';" onclick="VendorLogic.copyToClipboard('${code}')">
                        CLAIM KEY
                    </button>
                    <button class="btn-ghost auto" style="
                        padding: 0.85rem;
                        border-radius: 14px;
                        font-size: 0.72rem;
                        font-weight: 950;
                        background: rgba(255,255,255,0.02);
                        color: #fbbf24;
                        border: 1.5px solid rgba(251, 191, 36, 0.35);
                        letter-spacing: 0.05em;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.background='rgba(251, 191, 36, 0.1)'; this.style.borderColor='#fbbf24';" onmouseout="this.style.transform='none'; this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(251, 191, 36, 0.35)';" onclick="VendorLogic.captureAndDownloadResult('${code}')">
                        SAVE VOUCHER
                    </button>
                </div>
                <button class="btn-cta" style="
                    width: 100%;
                    padding: 0.95rem;
                    border-radius: 14px;
                    font-size: 0.78rem;
                    font-weight: 950;
                    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                    color: #fff;
                    border: none;
                    letter-spacing: 0.05em;
                    box-shadow: 0 10px 24px rgba(124, 58, 237, 0.35);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 30px rgba(124, 58, 237, 0.65)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 10px 24px rgba(124, 58, 237, 0.35)';" onclick="VendorLogic.viewResultCard('${code}')">
                    OPEN VAULT & VIEW SENSITIVITY
                </button>
                <button class="btn-ghost auto w-full mt-3" style="
                    font-size: 0.58rem;
                    opacity: 0.35;
                    border: none;
                    background: transparent;
                    color: #fff;
                    cursor: pointer;
                    letter-spacing: 0.15em;
                    font-family: var(--font-mono);
                    transition: opacity 0.2s;
                " onmouseover="this.style.opacity='0.85';" onmouseout="this.style.opacity='0.35';" onclick="this.closest('.quick-action-overlay').remove()">
                    [DISMISS UPLINK]
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    handleHoloMove(e, el) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = (x / rect.width) * 100;
        const py = (y / rect.height) * 100;
        el.style.setProperty('--holo-x', `${px}%`);
        el.style.setProperty('--holo-y', `${py}%`);
        
        // Tilt effect
        const rotateY = (px - 50) / 5;
        const rotateX = (50 - py) / 5;
        el.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    },

    showVendorCredentials() {
        const data = this.state.vendorData;
        if (!data) return;
        const tier = data.tier || 'normal';
        const isExpired = data.active_until && new Date(data.active_until) < new Date();
        
        const expiryText = data.active_until
            ? new Date(data.active_until).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase()
            : 'NEVER';
        const usageText = data.usage_limit
            ? `${data.total_hits || 0} / ${data.usage_limit}`.toUpperCase()
            : 'UNLIMITED';
        
        let statusLabel = '● ACTIVE';
        let statusClr = '#34d399';
        let statusBgClr = 'rgba(52,211,153,0.03)';
        let statusBorderClr = 'rgba(52,211,153,0.15)';
        let statusTopBorder = 'rgba(52,211,153,0.6)';
        
        if (isExpired) {
            statusLabel = '✕ EXPIRED';
            statusClr = '#f87171';
            statusBgClr = 'rgba(248,113,113,0.03)';
            statusBorderClr = 'rgba(248,113,113,0.15)';
            statusTopBorder = 'rgba(248,113,113,0.6)';
        } else if (data.status === 'suspended') {
            statusLabel = '⏸ SUSPENDED';
            statusClr = '#fbbf24';
            statusBgClr = 'rgba(251,191,36,0.03)';
            statusBorderClr = 'rgba(251,191,36,0.15)';
            statusTopBorder = 'rgba(251,191,36,0.6)';
        }
        
        const networkName = (data.brand_config?.display_name || data.display_name || data.vendor_id || 'AXP_NEXUS').toUpperCase();
        const createdDate = data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Dynamic theme styling per tier
        let cardBorder = 'rgba(255,180,0,0.5)';
        let cardGlow = 'rgba(255,180,0,0.08)';
        let badgeBg = 'rgba(255,180,0,0.12)';
        let badgeClr = '#ffd700';
        let badgeBorder = 'rgba(255,180,0,0.45)';
        let badgeGlow = 'rgba(255,180,0,0.15)';
        
        if (tier === 'gold') {
            cardBorder = 'rgba(255,215,0,0.5)';
            cardGlow = 'rgba(255,215,0,0.08)';
            badgeBg = 'rgba(255,215,0,0.12)';
            badgeClr = '#ffd700';
            badgeBorder = 'rgba(255,215,0,0.45)';
            badgeGlow = 'rgba(255,215,0,0.15)';
        } else if (tier === 'premium') {
            cardBorder = 'rgba(167,139,250,0.5)';
            cardGlow = 'rgba(167,139,250,0.08)';
            badgeBg = 'rgba(167,139,250,0.12)';
            badgeClr = '#a78bfa';
            badgeBorder = 'rgba(167,139,250,0.45)';
            badgeGlow = 'rgba(167,139,250,0.15)';
        } else if (tier === 'pro') {
            cardBorder = 'rgba(0,229,255,0.5)';
            cardGlow = 'rgba(0,229,255,0.08)';
            badgeBg = 'rgba(0,229,255,0.12)';
            badgeClr = '#00e5ff';
            badgeBorder = 'rgba(0,229,255,0.45)';
            badgeGlow = 'rgba(0,229,255,0.15)';
        } else if (tier === 'nexus' || tier === 'elite') {
            cardBorder = 'rgba(236,72,153,0.5)';
            cardGlow = 'rgba(236,72,153,0.08)';
            badgeBg = 'rgba(236,72,153,0.12)';
            badgeClr = '#ec4899';
            badgeBorder = 'rgba(236,72,153,0.45)';
            badgeGlow = 'rgba(236,72,153,0.15)';
        }

        const overlay = document.createElement('div');
        overlay.className = 'quick-action-overlay active';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(2, 6, 23, 0.9);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(20px); padding: 20px;
        `;
        
        overlay.innerHTML = `
            <div class="glass-panel" style="width: min(90vw, 340px); text-align: center; background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center;">
                <div id="captureArea" class="holo-card-vertical" onmousemove="VendorLogic.handleHoloMove(event, this)" style="
                    background: linear-gradient(155deg, #050a14 0%, #07101e 55%, #080f1c 100%);
                    border: 1.5px solid ${cardBorder};
                    border-radius: 24px;
                    padding: 1.5rem 1.5rem 1.25rem;
                    margin-bottom: 1.25rem;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    box-sizing: border-box;
                    box-shadow: 0 0 0 1px ${cardGlow}, 0 0 40px ${cardGlow}, 0 30px 80px rgba(0,0,0,0.8);
                    transition: transform 0.1s ease-out;
                ">
                    <!-- Tech Background Elements -->
                    <div style="position: absolute; inset: 0; opacity: 0.055; background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px); background-size: 22px 22px; pointer-events: none; z-index: 0;"></div>
                    <div style="position: absolute; top:-50px; right:-40px; width: 220px; height: 220px; background: radial-gradient(circle, ${cardBorder.replace('0.5', '0.18')} 0%, rgba(0,229,255,0.05) 50%, transparent 70%); pointer-events: none; z-index: 0;"></div>
                    <div style="height: 2.5px; width: 100%; background: linear-gradient(90deg, transparent, #ffd700, #00e5ff, #ffd700, transparent); position: absolute; top: 0; left: 0; z-index: 2;"></div>
                    
                    <!-- Header Row -->
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 1rem; position: relative; z-index: 2;">
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <div style="width: 40px; height: 40px; background: rgba(255,180,0,0.1); border: 1.5px solid rgba(255,180,0,0.45); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 0 12px rgba(255,180,0,0.12);">🛡️</div>
                            <div style="text-align: left;">
                                <div style="font-size: 0.5rem; color: rgba(255,180,0,0.8); letter-spacing: 0.18em; font-family: var(--font-mono); font-weight: 700; line-height: 1.2;">AXP_IDENTITY</div>
                                <div style="font-size: 0.95rem; font-weight: 900; color: #fff; letter-spacing: 0.04em; font-family: var(--font-mono); line-height: 1.2;">OPERATOR_CARD</div>
                            </div>
                        </div>
                        <div style="font-size: 0.55rem; font-weight: 900; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 50px; background: ${badgeBg}; color: ${badgeClr}; border: 1px solid ${badgeBorder}; box-shadow: 0 0 10px ${badgeGlow}; font-family: var(--font-mono);">${tier.toUpperCase()}</div>
                    </div>

                    <!-- Divider -->
                    <div style="height: 1px; width: 100%; background: linear-gradient(90deg, transparent, rgba(255,180,0,0.4), rgba(0,229,255,0.15), transparent); margin-bottom: 1rem; position: relative; z-index: 2;"></div>

                    <!-- Main Identity Section -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; position: relative; z-index: 2; margin-bottom: 1rem;">
                        <div style="width: 58px; height: 58px; border: 2px dashed ${cardBorder}; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); box-shadow: 0 0 20px ${cardGlow}; animation: goldPulse 2s infinite alternate; margin-bottom: 0.75rem; flex-shrink: 0;">
                            <div style="font-size: 1.6rem; animation: keyRotate 4s ease-in-out infinite;">🔑</div>
                        </div>
                        
                        <div style="font-size: 0.48rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px; font-weight: 800; font-family: var(--font-mono);">OPERATOR_SIGNATURE</div>
                        <div style="font-size: 1.35rem; font-weight: 950; color: #fff; text-transform: uppercase; letter-spacing: -0.01em; text-align: center; line-height: 1.2; margin-bottom: 4px; font-family: var(--font-mono); text-shadow: 0 0 16px rgba(255,255,255,0.25);">
                            ${data.display_name}
                        </div>
                        <div style="font-family: var(--font-mono); font-size: 0.58rem; color: ${badgeClr}; font-weight: 800; opacity: 0.9; letter-spacing: 0.05em;">UID: ${data.vendor_id}</div>
                    </div>

                    <!-- Secure Access Token Strip -->
                    <div style="background: linear-gradient(135deg, rgba(255,180,0,0.15) 0%, rgba(0,229,255,0.08) 100%); border: 1.5px solid rgba(255,180,0,0.45); border-radius: 12px; padding: 0.6rem 0.8rem; margin-bottom: 0.75rem; width: 100%; text-align: left; box-sizing: border-box; position: relative; z-index: 2;">
                        <div style="font-size: 0.48rem; color: rgba(0,0,0,0.45); letter-spacing: 0.18em; font-weight: 700; margin-bottom: 3px; font-family: var(--font-mono);">SECURE_ACCESS_PHRASE</div>
                        <div style="font-size: 1.15rem; font-weight: 900; letter-spacing: 0.06em; background: linear-gradient(90deg, #ffd700, #00e5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-family: var(--font-mono);">OP-${data.vendor_id}</div>
                    </div>

                    <!-- 2x2 Stats Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; width: 100%; text-align: left; position: relative; z-index: 2;">
                        <!-- EXPIRY -->
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,215,0,0.15); border-top: 2px solid rgba(255,215,0,0.6); border-radius: 10px; padding: 0.6rem 0.7rem;">
                            <div style="font-size: 0.45rem; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; margin-bottom: 4px; font-family: var(--font-mono);">EXPIRY_DATE</div>
                            <div style="font-size: 0.8rem; font-weight: 900; color: #ffd700; letter-spacing: 0.04em; font-family: var(--font-mono);">${expiryText}</div>
                        </div>

                        <!-- GEN LIMIT -->
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,229,255,0.15); border-top: 2px solid rgba(0,229,255,0.6); border-radius: 10px; padding: 0.6rem 0.7rem;">
                            <div style="font-size: 0.45rem; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; margin-bottom: 4px; font-family: var(--font-mono);">GEN_LIMIT</div>
                            <div style="font-size: 0.8rem; font-weight: 900; color: #00e5ff; letter-spacing: 0.04em; font-family: var(--font-mono);">${usageText}</div>
                        </div>

                        <!-- STATUS -->
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid ${statusBorderClr}; border-top: 2px solid ${statusTopBorder}; border-radius: 10px; padding: 0.6rem 0.7rem;">
                            <div style="font-size: 0.45rem; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; margin-bottom: 4px; font-family: var(--font-mono);">NODE_STATUS</div>
                            <div style="font-size: 0.8rem; font-weight: 900; color: ${statusClr}; letter-spacing: 0.04em; font-family: var(--font-mono);">${statusLabel}</div>
                        </div>

                        <!-- NETWORK -->
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(167,139,250,0.15); border-top: 2px solid rgba(167,139,250,0.6); border-radius: 10px; padding: 0.6rem 0.7rem;">
                            <div style="font-size: 0.45rem; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; margin-bottom: 4px; font-family: var(--font-mono);">NETWORK_ID</div>
                            <div style="font-size: 0.8rem; font-weight: 900; color: #a78bfa; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono);">${networkName}</div>
                        </div>
                    </div>

                    <!-- Footer Barcode Row -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; position: relative; z-index: 2;">
                        <div style="font-size: 0.45rem; color: rgba(255,255,255,0.3); line-height: 1.7; letter-spacing: 0.06em; text-align: left; font-family: var(--font-mono);">
                            ISSUED_BY: AXP_NEXUS<br>
                            ISSUED_ON: ${createdDate}
                        </div>
                        <!-- Styled barcode -->
                        <div style="display: flex; align-items: flex-end; gap: 1px; height: 28px; opacity: 0.45;">
                            <div style="width: 2px; height: 100%; background: #fff;"></div>
                            <div style="width: 1px; height: 70%; background: #fff;"></div>
                            <div style="width: 3px; height: 100%; background: #fff;"></div>
                            <div style="width: 1px; height: 40%; background: #fff;"></div>
                            <div style="width: 2px; height: 85%; background: #fff;"></div>
                            <div style="width: 1px; height: 100%; background: #fff;"></div>
                            <div style="width: 4px; height: 60%; background: #fff;"></div>
                            <div style="width: 2px; height: 90%; background: #fff;"></div>
                            <div style="width: 1px; height: 30%; background: #fff;"></div>
                            <div style="width: 3px; height: 100%; background: #fff;"></div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; width: 100%; box-sizing: border-box;">
                    <button class="btn-cta" style="
                        padding: 0.85rem;
                        border-radius: 14px;
                        font-size: 0.72rem;
                        font-weight: 950;
                        background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
                        color: #000;
                        border: none;
                        letter-spacing: 0.05em;
                        box-shadow: 0 8px 20px rgba(217, 119, 6, 0.35);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        font-family: var(--font-mono);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 25px rgba(217, 119, 6, 0.55)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 8px 20px rgba(217, 119, 6, 0.35)';" onclick="VendorLogic.captureAndDownloadResult('OPERATOR_${data.vendor_id}')">
                        DOWNLOAD_ID
                    </button>
                    <button class="btn-ghost auto" style="
                        padding: 0.85rem;
                        border-radius: 14px;
                        font-size: 0.72rem;
                        font-weight: 950;
                        background: rgba(255,255,255,0.02);
                        color: #fbbf24;
                        border: 1.5px solid rgba(251, 191, 36, 0.35);
                        letter-spacing: 0.05em;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        font-family: var(--font-mono);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.background='rgba(251, 191, 36, 0.1)'; this.style.borderColor='#fbbf24';" onmouseout="this.style.transform='none'; this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(251, 191, 36, 0.35)';" onclick="this.closest('.quick-action-overlay').remove()">
                        CLOSE
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async captureAndDownloadResult(code) {
        const area = document.getElementById('captureArea');
        if (!area) return window.notify('SYSTEM_NOT_READY', 'error');
        if (!window.html2canvas) return window.notify('ENGINE_FALLBACK_ACTIVE', 'warning');

        try {
            const EXPORT_SCALE = 3;

            // Snapshot & freeze every element's motion state so we capture
            // exactly what's visible — no mid-animation blur or tilt offset.
            const frozen = [];
            [area, ...area.querySelectorAll('*')].forEach(el => {
                frozen.push({
                    el,
                    animation:  el.style.animation,
                    transition: el.style.transition,
                    transform:  el.style.transform,
                });
                el.style.animation  = 'none';
                el.style.transition = 'none';
                el.style.transform  = 'none';
            });

            // Wait two frames so the browser paints the frozen state
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            const rect = area.getBoundingClientRect();
            const canvas = await html2canvas(area, {
                backgroundColor: null,   // use the element's own background exactly
                scale: EXPORT_SCALE,
                useCORS: true,
                allowTaint: true,
                width:  Math.round(rect.width),
                height: Math.round(rect.height),
                x: rect.left,
                y: rect.top,
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                windowWidth:  window.innerWidth,
                windowHeight: window.innerHeight,
                logging: false,
            });

            // Restore all motion state
            frozen.forEach(({ el, animation, transition, transform }) => {
                el.style.animation  = animation;
                el.style.transition = transition;
                el.style.transform  = transform;
            });

            const link = document.createElement('a');
            link.download = `AXP_CARD_${code}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

            window.notify('PREMIUM_CARD_EXPORTED', 'success');
        } catch (e) {
            window.notify('EXPORT_FAILED', 'error');
            console.error(e);
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

    viewResultCard(code) {
        window.location.href = `result.html?code=${encodeURIComponent(code)}`;
    },

    async fetchDiagnostic() {
        const id = document.getElementById('labIdInput')?.value.trim().toUpperCase();
        const status = document.getElementById('labStatus');
        if (!id) return;
        try {
            status.textContent = 'BUFFERING...';
            const res = await NexusAuth.fetch(`/api/vault/diagnostics/${id}`);
            const data = await res.json();
            if (data.diagnostic) {
                this.state.diagnosticData = data.diagnostic;
                status.textContent = `SYNC: ${data.diagnostic.avg_reaction_ms}ms / ${data.diagnostic.precision_score}%`;
                status.style.color = 'var(--violet)';
                if (window.notify) window.notify('HUMAN_DATA_SYNCED', 'success');
            } else {
                throw new Error('NOT_FOUND');
            }
        } catch (e) {
            status.textContent = 'NOT_FOUND';
            status.style.color = 'var(--error)';
            this.state.diagnosticData = null;
        }
    },

    async autoGenerate() {
        const brand = document.getElementById('genBrand')?.value;
        const series = document.getElementById('genSeries')?.value || '';
        const model = document.getElementById('genModel')?.value;
        const playstyle = document.getElementById('genPlaystyle')?.value || 'balanced';
        const claw = document.getElementById('genClaw')?.value || '3';
        const tier = this.state.vendorData?.tier || 'normal';

        if (!brand || !model) return window.notify('SELECT_DEVICE_FIRST', 'warning');

        const btn = document.getElementById('generateKeyBtn');
        if (btn) { btn.textContent = 'PROVISIONING...'; btn.disabled = true; }

        try {
            const res = await NexusAuth.fetch('/api/vault/vendor/generate/auto', {
                method: 'POST',
                body: JSON.stringify({ 
                    brand, series, model, 
                    speed: playstyle, claw, 
                    diagnosticData: this.state.diagnosticData 
                })
            });
            const data = await res.json();
            if (data.code || data.accessKey) {
                const code = data.code || data.accessKey;
                this.showResultCard(code, brand, model, tier);
                window.notify('ACCESS_KEY_GENERATED', 'success');
            } else {
                window.notify(data.error || 'GENERATION_FAILED', 'error');
            }
        } catch (err) {
            window.notify('GENERATION_FAILED', 'error');
        } finally {
            if (btn) { btn.textContent = 'PROVISION_ACCESS_KEY'; btn.disabled = false; }
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
            general: parseInt(document.getElementById('manualX')?.value || '85'),
            redDot:  parseInt(document.getElementById('manualY')?.value || '120'),
            scope2x: parseInt(document.getElementById('manualX')?.value || '85'),
            scope4x: parseInt(document.getElementById('manualX')?.value || '85'),
            sniper:  parseInt(document.getElementById('manualY')?.value || '85'),
            freeLook: parseInt(document.getElementById('manualY')?.value || '120')
        };
        try {
            GamingEffects.showLoadingBar(1200);
            const res = await NexusAuth.fetch('/api/vault/vendor/generate/manual', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.code || data.accessKey) {
                const code = data.code || data.accessKey;
                const activeOverlay = document.querySelector('.quick-action-overlay.active');
                if (activeOverlay) activeOverlay.remove();
                this.showResultCard(code, 'MANUAL', 'OVERRIDE', 'PRO');
                GamingEffects.createParticles(document.body, 30, 'violet');
                window.notify('MANUAL_KEY_ENCODED', 'success');
                GamingEffects.showSuccess('Calibration Generated!');
            } else {
                window.notify(data.error || 'ENCODING_FAILED', 'error');
                GamingEffects.showError('Generation Failed');
            }
        } catch (err) {
            window.notify('ENCODING_FAILED', 'error');
            GamingEffects.showError('Encoding Error');
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
            display_name: document.getElementById('brandName')?.value,
            brand_config: {
                logo_url: document.getElementById('brandLogo')?.value,
                social_link: document.getElementById('brandSocial')?.value
            }
        };
        try {
            const res = await NexusAuth.fetch('/api/vault/vendor/branding', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const activeOverlay = document.querySelector('.quick-action-overlay.active');
                if (activeOverlay) activeOverlay.remove();
                await this.fetchVendorProfile();
                window.notify('BRANDING_UPDATED', 'success');
            } else {
                const err = await res.json().catch(() => ({}));
                window.notify(err.error || 'UPDATE_FAILED', 'error');
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
            const res = await NexusAuth.fetch('/api/vault/vendor/keys');
            const data = await res.json();
            const list = document.getElementById('keysList');
            if (!list) return;
            if (!data.keys || data.keys.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">NO_ACTIVE_KEYS</div>`;
                return;
            }
            list.innerHTML = data.keys.map(k => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: white; font-weight: 800; font-family: var(--font-mono); font-size: 0.75rem; word-break: break-all;">${k.lookup_key}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 2px;">HITS: ${k.current_usage || 0} &nbsp;|&nbsp; STATUS: ${(k.status || 'active').toUpperCase()}</div>
                    </div>
                    <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 8px 14px; border-radius: 12px; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(255,68,68,0.2)'" onmouseout="this.style.background='rgba(255,68,68,0.1)'" onclick="VendorLogic.revokeKey('${k.lookup_key}')">REVOKE</button>
                </div>
            `).join('');
        } catch (err) { console.error('LOAD_KEYS_ERR:', err); }
    },

    async revokeKey(key) {
        this.showConfirm('REVOKE_ACCESS_KEY?', async () => {
            try {
                await NexusAuth.fetch(`/api/vault/vendor/keys/${key}`, { method: 'DELETE' });
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
            const res = await NexusAuth.fetch('/api/vault/vendor/presets');
            const data = await res.json();
            this.state.presets = data || [];
            const list = document.getElementById('presetsList');
            if (!list) return;
            if (!data || data.length === 0) {
                list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">NO_SAVED_PRESETS</div>`;
                return;
            }
            list.innerHTML = data.map(p => {
                const cfg = p.config_json || {};
                return `
                <div style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: white; font-weight: 800; font-family: var(--font-mono); font-size: 0.85rem; word-break: break-all;">${p.preset_name || 'PRESET'}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">${cfg.brand || ''} ${cfg.model || ''}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary" style="width: auto; padding: 6px 12px; font-size: 0.65rem;" onclick="VendorLogic.loadPresetToForm('${p.id}')">LOAD</button>
                        <button style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.2); padding: 6px; border-radius: 8px; cursor: pointer;" onclick="VendorLogic.deletePreset('${p.id}')">🗑️</button>
                    </div>
                </div>
                `;
            }).join('');
        } catch (err) { console.error('LOAD_PRESETS_ERR:', err); }
    },

    async saveCurrentAsPreset() {
        const name = prompt('ENTER_PRESET_NAME:');
        if (!name) return;

        const config = {
            brand: document.getElementById('genBrand')?.value || '',
            series: document.getElementById('genSeries')?.value || '',
            model: document.getElementById('genModel')?.value || '',
            playstyle: document.getElementById('genPlaystyle')?.value || 'balanced',
            claw: document.getElementById('genClaw')?.value || '3'
        };

        try {
            const res = await NexusAuth.fetch('/api/vault/vendor/presets', {
                method: 'POST',
                body: JSON.stringify({ name, config })
            });
            if (res.ok) {
                window.notify('PRESET_SAVED', 'success');
                this.loadPresets();
            } else {
                window.notify('SAVE_FAILED', 'error');
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
                await NexusAuth.fetch(`/api/vault/vendor/presets/${id}`, { method: 'DELETE' });
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
        NexusAuth.logout();
    },

    updateUI() {
        // Fix for static elements in HTML that might need handlers
        document.querySelectorAll('[data-action]').forEach(el => {
            const action = el.getAttribute('data-action');
            if (this[action]) el.onclick = () => this[action]();
        });
    }
};

// Global Quick Actions (renamed from VendorUI to avoid conflict with vendor_layout.js)
const VendorQuickActions = {
    toggleQuickActions(show) {
        if (show) {
            const tier = VendorLogic.state.vendorData?.tier || 'normal';
            const selector = document.createElement('div');
            selector.className = 'quick-action-overlay active';
            selector.style.zIndex = '10000';
            selector.innerHTML = `
                <div class="glass-panel tier-${tier}" style="width: 90%; max-width: 400px; padding: 2.5rem;">
                    <div class="section-header"><h2 class="section-title">QUICK_COMMANDS</h2></div>
                    <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-secondary" onclick="this.closest('.quick-action-overlay').remove(); VendorLogic.openManualCreator()">⚙️ MANUAL_OVERRIDE</button>
                        <button class="btn-secondary" onclick="this.closest('.quick-action-overlay').remove(); VendorLogic.openVaultManager()">🔑 KEY_VAULT</button>
                        <button class="btn-secondary" style="border-color: rgba(255,68,68,0.3); color: #ff4444 !important;" onclick="VendorLogic.handleLogout()">🚀 TERMINATE_SESSION</button>
                    </div>
                    <button class="btn-secondary" style="margin-top: 1.5rem; width: 100%;" onclick="this.closest('.quick-action-overlay').remove()">DISMISS</button>
                </div>
            `;
            document.body.appendChild(selector);
        }
    }
};

// Patch VendorUI.toggleQuickActions so vendor_layout.js FAB button still works
if (typeof VendorUI !== 'undefined') {
    VendorUI.toggleQuickActions = VendorQuickActions.toggleQuickActions.bind(VendorQuickActions);
}

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
