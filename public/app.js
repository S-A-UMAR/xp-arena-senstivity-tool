const state = {
    lang: localStorage.getItem('xp_lang') || 'en',
    ign: localStorage.getItem('xp_end_user_ign') || 'GUEST',
    region: localStorage.getItem('xp_end_user_region') || 'GLOBAL'
};

const SoftRecovery = {
    show(err) {
        if (document.getElementById('recoveryOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'recoveryOverlay';
        overlay.className = 'recovery-overlay reveal';
        overlay.innerHTML = `
            <div class="glass-card" style="text-align:center; border:1px solid rgba(255,68,68,0.35); max-width:420px; margin:10vh auto;">
                <div class="logo-badge" style="background:rgba(255,0,0,0.1); color:#ff7777; border-color:#ff7777;">SYSTEM_RECOVERY</div>
                <h2 style="margin:1rem 0; font-family:var(--font-heading);">UPLINK INTERRUPTION</h2>
                <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.6;">The verification layer hit an unexpected state. Reload to restore the secure tunnel.</p>
                <code style="display:block; background:#030712; padding:0.75rem; font-size:0.65rem; border-radius:10px; color:#ff7777; margin:1rem 0 1.5rem;">${err?.message || 'UNKNOWN_FAILURE'}</code>
                <button class="action-btn" onclick="location.reload()">RETRY_SESSION</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
};

window.onerror = (msg) => SoftRecovery.show({ message: msg });
window.onunhandledrejection = (event) => SoftRecovery.show({ message: event?.reason?.message || event?.reason || 'PROMISE_REJECTION' });

let deferredPrompt = null;

const UI = {
    elements: {
        vaultOverlay: document.getElementById('vaultOverlay'),
        vaultInput: document.getElementById('vaultInput'),
        vaultStatus: document.getElementById('vaultStatus'),
        vaultAuthBtn: document.getElementById('vaultAuthBtn'),
        scannerOverlay: document.getElementById('scannerOverlay'),
        notifyToast: document.getElementById('notifyToast')
    },
    verifying: false,

    init() {
        this.attachVaultListeners();
        this.initPWA();
        this.initLanguage();
        this.trackFunnel('landing_view');
        this.animateScannerDots();
        document.body.addEventListener('click', () => window.SFX?.init?.(), { once: true });
    },

    initLanguage() {
        document.documentElement.lang = state.lang;
    },

    notify(message, type = 'info') {
        if (window.notify) window.notify(message, type);
    },

    showVaultErrorOverlay(message) {
        const existing = document.getElementById('vaultErrorOverlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'vaultErrorOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;
            background: rgba(2, 8, 20, 0.78); backdrop-filter: blur(6px); padding: 1rem;
        `;
        overlay.innerHTML = `
            <div style="width:min(420px, 100%); background:#0b1421; border:1px solid rgba(255,107,107,0.35); border-radius:20px; padding:1.1rem 1rem; text-align:center; box-shadow:0 24px 50px rgba(0,0,0,0.45);">
                <div class="logo-badge" style="background:rgba(255,68,68,0.1); color:#ff8f8f; border-color:rgba(255,68,68,0.35);">ACCESS_ERROR</div>
                <p style="margin:0.9rem 0 0.3rem; color:#d9e6f5; font-family:var(--font-mono); letter-spacing:0.05em;">${String(message || 'INVALID_ACCESS_KEY')}</p>
                <button id="vaultErrorDismissBtn" class="action-btn" style="margin-top:0.9rem; width:100%;">TRY AGAIN</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('vaultErrorDismissBtn')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) overlay.remove();
        });
    },

    attachVaultListeners() {
        const { vaultInput, vaultAuthBtn } = this.elements;
        if (!vaultInput) return;

        const params = new URLSearchParams(window.location.search);
        const prefilled = params.get('code') || localStorage.getItem('xp_last_entry_code') || '';
        if (prefilled) vaultInput.value = prefilled.toUpperCase();

        vaultInput.addEventListener('input', (event) => {
            event.target.value = event.target.value.toUpperCase().replace(/\s+/g, '');
        });

        vaultInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') this.verifyVault(vaultInput.value.trim().toUpperCase());
        });

        vaultAuthBtn?.addEventListener('click', () => this.verifyVault(vaultInput.value.trim().toUpperCase()));
    },

    initPWA() {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.style.display = 'inline-flex';
        });

        document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
            if (!deferredPrompt) {
                this.notify("INSTALL TIP: USE YOUR BROWSER'S ADD TO HOME SCREEN", 'info');
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                document.getElementById('pwaInstallBtn').style.display = 'none';
            }
            deferredPrompt = null;
        });
    },

    animateScannerDots() {
        const sparkles = document.getElementById('scannerSparkles');
        if (!sparkles) return;
        sparkles.innerHTML = Array.from({ length: 18 }, (_, idx) => `
            <span style="--i:${idx}; left:${(idx * 17) % 100}%; top:${(idx * 29) % 100}%;"></span>
        `).join('');
    },

    async trackFunnel(type) {
        try {
            const generatedId = (window.crypto && typeof window.crypto.randomUUID === 'function')
                ? window.crypto.randomUUID()
                : `xp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            const sessionId = localStorage.getItem('xp_session_id') || generatedId;
            localStorage.setItem('xp_session_id', sessionId);
            await fetch('/api/vault/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: type,
                    vendor_id: 'XP-PUBLIC',
                    session_id: sessionId,
                    device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                })
            });
        } catch (_err) {}
    },

    async verifyVault(code) {
        if (!code || this.verifying) return;

        const status = this.elements.vaultStatus;
        const input = this.elements.vaultInput;
        try {
            this.verifying = true;
            status.textContent = 'VERIFYING ACCESS FRAGMENT...';
            status.style.color = 'var(--text-muted)';
            input.classList.remove('error');
            this.elements.scannerOverlay?.classList.remove('hidden');

            const response = await fetch('/api/vault/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: code, user_ign: state.ign, user_region: state.region })
            });
            const payload = await response.json().catch(() => ({ error: 'SERVER_RESPONSE_MALFORMED' }));

            if (!response.ok) {
                throw new Error(payload.error || payload.message || 'INVALID_ACCESS_KEY');
            }

            localStorage.setItem('xp_last_entry_code', code);
            if (payload.branding) localStorage.setItem('xp_last_branding', JSON.stringify(payload.branding));
            if (payload.results || payload.sensitivity) {
                localStorage.setItem('xp_sensitivity_profile_last_result', JSON.stringify(payload.results || payload.sensitivity));
            }

            status.textContent = payload.message || 'ACCESS GRANTED // LOADING DESTINATION';
            status.style.color = 'var(--accent-primary)';
            window.SFX?.play?.('ping');

            sessionStorage.setItem('xp_nav_origin', 'verify.html');
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            window.location.href = payload.redirect || `/result.html?code=${encodeURIComponent(code)}`;
        } catch (err) {
            status.textContent = err.message || 'INVALID ACCESS KEY';
            status.style.color = '#ff6b6b';
            input.classList.add('error');
            this.showVaultErrorOverlay(err.message || 'INVALID ACCESS KEY');
            window.SFX?.play?.('click');
        } finally {
            setTimeout(() => {
                this.elements.scannerOverlay?.classList.add('hidden');
                this.verifying = false;
            }, 400);
        }
    }
};

window.UI = UI;

window.toggleLowPerf = function toggleLowPerf() {
    const key = 'xp_low_perf_mode';
    const isEnabled = localStorage.getItem(key) === 'true';
    const next = !isEnabled;
    localStorage.setItem(key, next ? 'true' : 'false');
    document.documentElement.dataset.lowPerf = next ? 'true' : 'false';
    const btn = document.getElementById('perfBtn');
    if (btn) {
        btn.textContent = next ? 'MODE: LOW_PERF' : 'MODE: FULL_NEURAL';
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
document.addEventListener('DOMContentLoaded', () => {
    const enabled = localStorage.getItem('xp_low_perf_mode') === 'true';
    document.documentElement.dataset.lowPerf = enabled ? 'true' : 'false';
    const btn = document.getElementById('perfBtn');
    if (btn) btn.textContent = enabled ? 'MODE: LOW_PERF' : 'MODE: FULL_NEURAL';
});
