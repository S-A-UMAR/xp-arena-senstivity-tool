(function () {
    const AXP_LOGO = 'favicon.svg';
    const Utils = window.ResultUtils || {};
    const clamp = Utils.clamp || ((num, min, max) => Math.max(min, Math.min(max, num)));
    const parseRange = Utils.parseRange || ((value) => {
        const n = Number.parseFloat(value);
        return Number.isFinite(n) ? [n, n] : ['--', '--'];
    });
    const inferEfficiency = Utils.inferEfficiency || (() => 94);
    const buildShareText = Utils.buildShareText || ((details) => JSON.stringify(details));

    let currentCode = '';
    let currentShareToken = '';
    let currentShareUrl = '';
    let currentVerifyPayload = null;
    let currentEfficiency = 94;
    let expiryTimer = null;
    let utcInterval = null;
    let currentDisplayName = '';
    let currentAdvice = '';
    let currentShareDetails = null;

    function buildResultUrl({ code = '', shareToken = '' }) {
        if (shareToken) return `${window.location.origin}/result.html?share=${encodeURIComponent(shareToken)}`;
        return code ? `${window.location.origin}/result.html?code=${encodeURIComponent(code)}` : '';
    }

    let isPrecise = localStorage.getItem('axp_precise_mode') === 'true';

    function updateDisplayValues() {
        if (!currentVerifyPayload) return;
        const results = currentVerifyPayload.results || currentVerifyPayload.sensitivity || {};
        const raw = results._raw || {};

        const setVal = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (isPrecise && raw[key]) {
                el.textContent = typeof raw[key] === 'number' ? raw[key].toFixed(1) : raw[key];
                el.classList.add('text-cyan');
            } else {
                el.textContent = results[key] || '--';
                el.classList.remove('text-cyan');
            }
        };

        setVal('idGeneral', 'general');
        setVal('idRedDot', 'redDot');
        setVal('id2x', 'scope2x');
        setVal('id4x', 'scope4x');
        setVal('idSniper', 'sniperScope');
        setVal('idFreeLook', 'freeLook');
        setVal('idDPI', 'dpi');
        setVal('idFireButton', 'fireButton');
        
        // Update share details for image export
        if (currentShareDetails) {
            currentShareDetails = { 
                ...currentShareDetails,
                general: isPrecise && raw.general ? raw.general.toFixed(1) : results.general,
                redDot: isPrecise && raw.redDot ? raw.redDot.toFixed(1) : results.redDot,
                scope2x: isPrecise && raw.scope2x ? raw.scope2x.toFixed(1) : results.scope2x,
                scope4x: isPrecise && raw.scope4x ? raw.scope4x.toFixed(1) : results.scope4x,
                sniper: isPrecise && raw.sniperScope ? raw.sniperScope.toFixed(1) : results.sniperScope,
                freeLook: isPrecise && raw.freeLook ? raw.freeLook.toFixed(1) : results.freeLook,
                dpi: results.dpi,
                fireButton: results.fireButton
            };
            updateShareCard(currentShareDetails);
        }
    }

    function storeLastResult(payload, fallbackBranding) {
        localStorage.setItem('axp_last_entry_code', currentCode);
        localStorage.setItem(
            'axp_sensitivity_profile_last_result',
            JSON.stringify({ ...(payload.sensitivity || payload.results || {}), advice: payload.advice || payload.sensitivity?.advice || '' })
        );
        localStorage.setItem('axp_last_branding', JSON.stringify(payload.branding || fallbackBranding || {}));
    }

    function buildHydratedState({ payload = null, fallbackResults = {}, fallbackBranding = {}, likes = 0, validUntil = null, advice = '', displayName = '', vendorId = '' }) {
        return {
            results: payload?.sensitivity || payload?.results || fallbackResults || {},
            branding: payload?.branding || fallbackBranding || {},
            likes: payload?.likes || likes || 0,
            validUntil: payload?.valid_until || validUntil || null,
            advice: payload?.advice || payload?.sensitivity?.advice || advice || '',
            displayName: payload?.display_name || displayName || '',
            vendorId: payload?.vendor_id || vendorId || '',
            shareToken: currentShareToken,
            shareUrl: currentShareUrl
        };
    }

    function t(key, fallback) {
        const lang = localStorage.getItem('axp_lang') || 'en';
        const fallbackDict = (window.LANGUAGES && window.LANGUAGES.en) || {};
        const currentDict = (window.LANGUAGES && window.LANGUAGES[lang]) || {};
        return currentDict[key] || fallbackDict[key] || fallback;
    }

    function isReducedMotionActive() {
        return document.documentElement.dataset.reduceMotion === 'true'
            || document.body.dataset.reduceMotion === 'true'
            || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }

    function updateUtcClock() {
        const el = document.getElementById('currentUtcLabel');
        if (!el || document.hidden) return;
        el.textContent = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
    }

    function startUtcClock() {
        if (utcInterval) clearInterval(utcInterval);
        updateUtcClock();
        utcInterval = setInterval(updateUtcClock, isReducedMotionActive() ? 30000 : 1000);
    }

    function setEfficiency(value) {
        const safeValue = clamp(Math.round(value || 0), 0, 100);
        currentEfficiency = safeValue;
        ['profileEfficiency', 'profileEfficiencyCard', 'verifiedEfficiency'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${safeValue}%`;
        });
        const bar = document.getElementById('efficiencyBar');
        if (bar) bar.style.width = `${safeValue}%`;
    }

    function setExpiryState(validUntil) {
        const expiryValue = document.getElementById('expiryValue');
        const warning = document.getElementById('expiryWarning');
        if (expiryTimer) clearInterval(expiryTimer);
        if (!expiryValue || !warning) return;

        if (!validUntil) {
            expiryValue.textContent = 'NEVER';
            warning.className = 'status-banner hidden';
            warning.textContent = '';
            return;
        }

        const expiryDate = new Date(validUntil);
        expiryValue.textContent = `${expiryDate.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
        const render = () => {
            if (document.hidden) return;
            const diff = expiryDate.getTime() - Date.now();
            if (diff <= 0) {
                warning.className = 'status-banner expired';
                warning.textContent = '❌ CODE EXPIRED';
                return;
            }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            if (diff <= 24 * 60 * 60 * 1000) {
                warning.className = 'status-banner warn';
                warning.textContent = `⏰ CODE EXPIRES IN ${hours} HOURS ${minutes} MINUTES`;
            } else {
                warning.className = 'status-banner hidden';
                warning.textContent = '';
            }
        };
        render();
        expiryTimer = setInterval(render, isReducedMotionActive() ? 60000 : 1000);
    }

    async function hydrateFromStatus({ code, shareToken, fallbackResults, fallbackBranding }) {
        const endpoint = shareToken
            ? `/api/vault/share/${encodeURIComponent(shareToken)}/status`
            : `/api/vault/code/${encodeURIComponent(code)}/status`;
        try {
            const response = await fetch(endpoint);
            const payload = await response.json();
            if (!response.ok) {
                // 🛡️ Strict Auth: If API says not found, clearing stale local data and redirecting
                if (response.status === 404 || response.status === 401) {
                    localStorage.removeItem('axp_last_entry_code');
                    localStorage.removeItem('axp_sensitivity_profile_last_result');
                    window.location.href = 'index.html?error=INVALID_ACCESS_KEY';
                    return null;
                }
                throw new Error(payload.error || payload.message || 'STATUS_REFRESH_FAILED');
            }
            currentVerifyPayload = payload;
            currentCode = payload.entry_code || code || '';
            currentShareToken = payload.share_token || shareToken || '';
            currentShareUrl = buildResultUrl({ code: currentCode, shareToken: currentShareToken });

            storeLastResult(payload, fallbackBranding);

            return buildHydratedState({ payload, fallbackResults, fallbackBranding });
        } catch (e) {
            console.warn('STATUS_REFRESH_ERR:', e);
            // Only allow fallback if it's a network error, not an auth error
            if (e.message.includes('NOT_FOUND') || e.message.includes('INVALID')) {
                 window.location.href = 'index.html?error=AUTH_FAILED';
                 return null;
            }
            
            currentCode = code || currentCode;
            currentShareToken = shareToken || currentShareToken;
            currentShareUrl = buildResultUrl({ code: currentCode, shareToken: currentShareToken });
            return buildHydratedState({
                fallbackResults,
                fallbackBranding,
                advice: fallbackResults?.advice || '',
                displayName: fallbackBranding?.display_name || '',
                vendorId: fallbackBranding?.vendor_id || ''
            });
        }
    }

    async function copyPlainText(value, successMessage) {
        await navigator.clipboard.writeText(value);
        window.notify?.(t('accessCodeCopied', successMessage), 'success');
    }

    // paintRange helper removed in favor of direct assignment
    function applyTrendLine(id, values) {
        const [a, b] = parseRange(values);
        const el = document.getElementById(id);
        const signal = document.getElementById(id.replace('trend', 'signal'));
        if (!el || a === '--') return;
        const avg = (a + b) / 2;
        if (avg >= 170) {
            el.textContent = 'TREND: OPTIMIZING';
            if (signal) signal.textContent = '↑';
        } else if (avg >= 145) {
            el.textContent = 'TREND: STABLE';
            if (signal) signal.textContent = '↑';
        } else {
            el.textContent = 'TREND: FINE-TUNING';
            if (signal) signal.textContent = '↘';
        }
    }

    function updateShareCard(details) {
        document.getElementById('shareLogo').src = details.logo;
        document.getElementById('shareFooterLogo').src = details.logo;
        document.getElementById('shareDevicePreview').src = details.logo;
        document.getElementById('shareUtc').textContent = `UTC: ${new Date().toISOString().slice(0,16).replace('T',' ')}`;
        document.getElementById('shareExpiry').textContent = `EXP: ${details.expiry}`;
        document.getElementById('shareEfficiencyBar').style.width = `${details.efficiency}%`;
        document.getElementById('shareEfficiencyLabel').textContent = `EFFICIENCY: ${details.efficiency}%`;
        document.getElementById('shareDeviceModel').textContent = details.model;
        document.getElementById('shareCreatorName').textContent = `OPERATOR: ${details.creator}`;
        document.getElementById('shareAccessCode').textContent = details.code;
        document.getElementById('shareGeneral').textContent = details.general;
        document.getElementById('shareRedDot').textContent = details.redDot;
        document.getElementById('share2x').textContent = details.scope2x;
        document.getElementById('share4x').textContent = details.scope4x;
        document.getElementById('shareSniper').textContent = details.sniper;
        document.getElementById('shareFreeLook').textContent = details.freeLook;
        document.getElementById('shareDpi').textContent = details.dpi;
        document.getElementById('shareFireButton').textContent = details.fireButton;
        document.getElementById('shareAdvice').textContent = details.advice || 'OPTIMIZED FOR COMPETITIVE PLAY';
        document.getElementById('shareVerified').textContent = `\u2713 VERIFIED ${details.efficiency}%`;
    }

    function formatAccessCode(vendor, code) {
        return code || 'FREE-GEN';
    }

    function buildCardDetails({ branding, hydrated, modelText, displayName, code, results }) {
        const formattedCode = formatAccessCode(hydrated.vendorId, code);
        return {
            logo: AXP_LOGO,
            expiry: hydrated.validUntil ? document.getElementById('expiryValue').textContent : 'NEVER',
            efficiency: currentEfficiency,
            model: modelText,
            creator: displayName,
            code: formattedCode,
            general: results.general || '--',
            redDot: results.redDot || '--',
            scope2x: results.scope2x || '--',
            scope4x: results.scope4x || '--',
            sniper: results.sniperScope || '--',
            freeLook: results.freeLook || '--',
            dpi: results.dpi || 'DEFAULT',
            fireButton: results.fireButton || '--',
            trendGeneral: 'OPTIMIZING',
            trendRed: 'DYNAMIC SCALING',
            trendScope: 'PRECISION CONTROL',
            advice: hydrated.advice || 'OPTIMIZED FOR COMPETITIVE PLAY'
        };
    }

    async function exportShareCardImage(details, filename) {
        if (window.html2canvas) {
            const area = document.getElementById('shareCaptureArea');
            if (!area) throw new Error('CAPTURE_AREA_NOT_FOUND');

            const EXPORT_SCALE = 3;

            // The shareCaptureArea lives inside a display:none shell.
            // Make it visible off-screen at 0,0 (with z-index behind viewport) so the browser computes layout properly.
            // Explicitly set width to 860px to match the card and prevent layout squishing on mobile.
            const shell = area.closest('.share-card-export-shell') || area.parentElement;
            const shellWasHidden = shell && getComputedStyle(shell).display === 'none';
            const origShellStyle = shell ? shell.getAttribute('style') || '' : '';
            if (shellWasHidden && shell) {
                shell.style.cssText = `${origShellStyle}; position: fixed !important; left: 0 !important; top: 0 !important; width: 860px !important; z-index: -9999 !important; display: block !important; visibility: visible !important; opacity: 1 !important; pointer-events: none !important;`;
            }

            // Freeze animations on the original element (not a clone) so
            // the captured image is pixel-perfect to what you see in the browser.
            const frozen = [];
            [area, ...area.querySelectorAll('*')].forEach(el => {
                frozen.push({ el, animation: el.style.animation, transition: el.style.transition, transform: el.style.transform });
                el.style.animation  = 'none';
                el.style.transition = 'none';
                el.style.transform  = 'none';
            });

            // Pre-load and convert all image elements inside the area to Base64 to bypass CORS tainting
            const images = area.querySelectorAll('img');
            await Promise.all(Array.from(images).map(async (img) => {
                const src = img.src;
                if (!src || src.startsWith('data:')) return;
                try {
                    const res = await fetch(src);
                    if (!res.ok) throw new Error(`HTTP_${res.status}`);
                    const blob = await res.blob();
                    await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            img.src = reader.result;
                            resolve();
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn('Failed to convert image to base64 before export:', src, e);
                }
            }));

            // Let the browser settle with the new state
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            try {
                const canvas = await window.html2canvas(area, {
                    scale: EXPORT_SCALE,
                    backgroundColor: '#050a14',   // match the card's base gradient dark color to ensure crisp background colors
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                });

                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            } finally {
                // Restore animation state on original element
                frozen.forEach(({ el, animation, transition, transform }) => {
                    el.style.animation  = animation;
                    el.style.transition = transition;
                    el.style.transform  = transform;
                });
                // Restore shell visibility
                if (shellWasHidden && shell) {
                    shell.setAttribute('style', origShellStyle);
                }
            }
            return;
        }

        // === PREMIUM CANVAS FALLBACK: Master Key Card ===
        const W = 1200, H = 900;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('CARD_EXPORT_UNAVAILABLE');

        const drawRR = (x, y, w, h, r, fill, strokeClr = null, strokeW = 1) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            if (strokeClr) { ctx.strokeStyle = strokeClr; ctx.lineWidth = strokeW; ctx.stroke(); }
        };

        // Background – deep dark with subtle blue tint
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#050a14');
        bg.addColorStop(1, '#08101f');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Glowing orb top-right
        const orb = ctx.createRadialGradient(W - 120, 120, 0, W - 120, 120, 300);
        orb.addColorStop(0, 'rgba(255,180,0,0.18)');
        orb.addColorStop(0.5, 'rgba(0,229,255,0.06)');
        orb.addColorStop(1, 'transparent');
        ctx.fillStyle = orb;
        ctx.fillRect(0, 0, W, H);

        // Outer card border
        drawRR(12, 12, W - 24, H - 24, 28, null, 'rgba(255,180,0,0.4)', 1.5);
        drawRR(16, 16, W - 32, H - 32, 24, null, 'rgba(0,229,255,0.08)', 1);

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        for (let x = 40; x < W; x += 60) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 40; y < H; y += 60) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // === HEADER SECTION ===
        // Gold key icon area (top-left)
        drawRR(36, 36, 72, 72, 16, 'rgba(255,180,0,0.12)', 'rgba(255,180,0,0.5)', 1.5);
        ctx.font = 'bold 36px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🔑', 72, 84);

        ctx.textAlign = 'left';
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('AXP_NEXUS', 124, 65);
        ctx.font = '13px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,180,0,0.9)';
        ctx.fillText('MASTER CALIBRATION CARD', 124, 90);

        // Right side UTC / expiry
        ctx.textAlign = 'right';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`UTC: ${new Date().toISOString().slice(0, 16).replace('T',' ')}`, W - 36, 60);
        ctx.fillText(`EXP: ${details.expiry}`, W - 36, 80);

        // Efficiency bar
        const effX = W - 260, effY = 94, effW = 220, effH = 6;
        drawRR(effX, effY, effW, effH, 3, 'rgba(255,255,255,0.08)');
        const effFill = ctx.createLinearGradient(effX, effY, effX + effW, effY);
        effFill.addColorStop(0, '#ffd700');
        effFill.addColorStop(1, '#00e5ff');
        ctx.fillStyle = effFill;
        drawRR(effX, effY, effW * (details.efficiency / 100), effH, 3, effFill);
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText(`EFFICIENCY: ${details.efficiency}%`, W - 36, 116);
        ctx.textAlign = 'left';

        // Divider
        const divGrad = ctx.createLinearGradient(36, 0, W - 36, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.2, 'rgba(255,180,0,0.5)');
        divGrad.addColorStop(0.8, 'rgba(0,229,255,0.3)');
        divGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(36, 128); ctx.lineTo(W - 36, 128); ctx.stroke();

        // === DEVICE + CREATOR ZONE ===
        drawRR(36, 140, W - 72, 115, 18, 'rgba(255,255,255,0.03)', 'rgba(255,180,0,0.15)', 1);

        // Device icon frame
        drawRR(52, 155, 80, 80, 14, 'rgba(255,180,0,0.08)', 'rgba(255,180,0,0.3)', 1);
        ctx.font = 'bold 32px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,180,0,0.8)';
        ctx.fillText('📱', 92, 202);

        ctx.textAlign = 'left';
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText('UNIT_MODEL', 148, 172);
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        const modelDisplay = details.model.length > 22 ? details.model.slice(0, 22) + '…' : details.model;
        ctx.fillText(modelDisplay, 148, 200);
        ctx.font = '13px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0,229,255,0.9)';
        ctx.fillText(`OPERATOR: ${details.creator}`, 148, 224);

        // === ACCESS TOKEN STRIP ===
        const tokenGrad = ctx.createLinearGradient(36, 270, W - 36, 270);
        tokenGrad.addColorStop(0, 'rgba(255,180,0,0.22)');
        tokenGrad.addColorStop(1, 'rgba(0,229,255,0.10)');
        drawRR(36, 268, W - 72, 60, 14, tokenGrad, 'rgba(255,180,0,0.5)', 1);

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText('ACCESS_TOKEN', 60, 292);
        ctx.font = 'bold 24px "Courier New", monospace';
        const codeGrad = ctx.createLinearGradient(60, 300, 400, 300);
        codeGrad.addColorStop(0, '#ffd700');
        codeGrad.addColorStop(1, '#00e5ff');
        ctx.fillStyle = codeGrad;
        ctx.fillText(details.code, 60, 316);

        ctx.textAlign = 'right';
        drawRR(W - 200, 276, 148, 42, 21, 'rgba(0,229,255,0.12)', 'rgba(0,229,255,0.4)', 1);
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText('✓ SYNCED_PROFILE', W - 60, 303);
        ctx.textAlign = 'left';

        // === STATS GRID (8 tiles, 4x2) ===
        const stats = [
            { label: 'GENERAL_SENS', val: details.general, icon: '↑', clr: '#00e5ff' },
            { label: 'RED_DOT', val: details.redDot, icon: '🔴', clr: '#ff6b8a' },
            { label: '2X_SCOPE', val: details.scope2x, icon: '↑', clr: '#a78bfa' },
            { label: '4X_SCOPE', val: details.scope4x, icon: '↑', clr: '#a78bfa' },
            { label: 'SNIPER', val: details.sniper, icon: '↘', clr: '#ffd700' },
            { label: 'FREE_LOOK', val: details.freeLook, icon: '↗', clr: '#34d399' },
            { label: 'DPI', val: details.dpi, icon: '◎', clr: '#00e5ff' },
            { label: 'FIRE_BTN', val: details.fireButton, icon: '✦', clr: '#f97316' }
        ];
        const cols = 4, rows = 2;
        const tileW = (W - 72 - (cols - 1) * 12) / cols;
        const tileH = 116;
        const gridStartX = 36, gridStartY = 345;

        stats.forEach((s, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const tx = gridStartX + col * (tileW + 12);
            const ty = gridStartY + row * (tileH + 12);
            drawRR(tx, ty, tileW, tileH, 14, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)', 1);

            // Subtle accent top border
            ctx.strokeStyle = s.clr;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tx + 14, ty); ctx.lineTo(tx + tileW - 14, ty); ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.font = '10px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(s.label, tx + 14, ty + 22);

            ctx.font = `bold ${String(s.val).length > 6 ? 20 : 28}px "Courier New", monospace`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(String(s.val || '--'), tx + 14, ty + 64);

            ctx.textAlign = 'right';
            ctx.font = 'bold 22px serif';
            ctx.fillStyle = s.clr;
            ctx.fillText(s.icon, tx + tileW - 14, ty + 40);
            ctx.textAlign = 'left';

            ctx.font = '9px "Courier New", monospace';
            ctx.fillStyle = s.clr;
            ctx.globalAlpha = 0.7;
            ctx.fillText('● LIVE', tx + 14, ty + tileH - 14);
            ctx.globalAlpha = 1;
        });

        // === FOOTER ===
        const footerY = gridStartY + rows * (tileH + 12) + 8;
        drawRR(36, footerY, W - 72, 52, 14, 'rgba(255,255,255,0.025)', 'rgba(255,255,255,0.06)', 1);
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('OPERATOR_ADVICE:', 56, footerY + 20);
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        const adviceShort = (details.advice || 'OPTIMIZED FOR COMPETITIVE PLAY').slice(0, 70);
        ctx.fillText(adviceShort, 56, footerY + 39);

        ctx.textAlign = 'right';
        drawRR(W - 190, footerY + 8, 142, 34, 17, 'rgba(0,229,255,0.1)', 'rgba(0,229,255,0.4)', 1);
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText(`✓ VERIFIED ${details.efficiency}%`, W - 56, footerY + 30);
        ctx.textAlign = 'left';

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }

    function updateAdviceCopy(advice) {
        const adviceEl = document.getElementById('creatorAdvice');
        if (!adviceEl) return;
        adviceEl.textContent = advice
            ? `${t('profileNotesPrefix', 'PROFILE NOTES: OPTIMIZED FOR COMPETITIVE PLAY')} — ${advice}`
            : `${t('profileNotesPrefix', 'PROFILE NOTES: OPTIMIZED FOR COMPETITIVE PLAY')} — [${t('noAdvice', 'NO_EXTRA_ADVICE_PROVIDED')}]`;
    }

    function updateShareHint() {
        const shareHint = document.getElementById('shareLinkHint');
        if (shareHint) shareHint.textContent = currentShareUrl ? `${t('secureShare', 'SECURE SHARE')}: ${currentShareUrl}` : '';
    }

    function bindMotionEffects() {
        const stage = document.querySelector('.card-stage');
        const area = document.getElementById('captureArea');
        if (stage) requestAnimationFrame(() => stage.classList.add('ready'));
        if (!area || isReducedMotionActive()) return;
        area.addEventListener('pointermove', (event) => {
            const rect = area.getBoundingClientRect();
            const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -4;
            const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 4;
            area.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        area.addEventListener('pointerleave', () => {
            area.style.transform = 'rotateX(0deg) rotateY(0deg)';
        });
    }

    function applyResultLang() {
        const title = document.querySelector('.title-main');
        if (title) title.textContent = t('resultsTitle', 'AUTHORIZATION_SUCCESS');
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.textContent = t('downloadBtn', 'DOWNLOAD_ID');
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) copyBtn.textContent = `${t('copyBtn', 'COPY_TEXT')} / SHARE`;
        const rail = document.getElementById('codeRailText');
        if (rail && currentShareDetails) {
            rail.textContent = currentShareDetails.code;
        }
        updateAdviceCopy(currentAdvice);
        updateShareHint();
        if (currentShareDetails) updateShareCard(currentShareDetails);
        const chipMode = document.getElementById('chipMode');
        if (chipMode) {
            chipMode.textContent = t('viewExportMode', 'VIEW / EXPORT');
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        startUtcClock();
        GamingEffects.showLoadingBar(1500);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                updateUtcClock();
                setExpiryState(currentVerifyPayload?.valid_until || currentVerifyPayload?.validUntil || currentVerifyPayload?.valid_until || null);
            }
        });

        const params = new URLSearchParams(window.location.search);
        const fallbackResults = JSON.parse(localStorage.getItem('axp_sensitivity_profile_last_result') || '{}');
        const state = JSON.parse(localStorage.getItem('axp_sensitivity_profile') || '{}');
        const fallbackBranding = JSON.parse(localStorage.getItem('axp_last_branding') || '{}');
        currentCode = params.get('code') || localStorage.getItem('axp_last_entry_code') || '';
        currentShareToken = params.get('share') || '';

        const hydrated = await hydrateFromStatus({
            code: currentCode,
            shareToken: currentShareToken,
            fallbackResults,
            fallbackBranding
        });
        const results = hydrated.results;
        const branding = hydrated.branding;
        if (!results.general) {
            window.location.href = 'index.html';
            return;
        }

        currentVerifyPayload = { ...currentVerifyPayload, ...hydrated };
        const code = currentCode || 'FREE-GEN';
        const displayName = branding.display_name || hydrated.displayName || hydrated.vendorId || 'XP_CORE';
        currentDisplayName = displayName;
        const modelText = `${results.brand || state.brand || 'GENERIC'} ${results.model || state.model || 'DEVICE'}`.toUpperCase();

        try {
            NexusAuth.fetch('/api/vault/track', {
                method: 'POST',
                body: JSON.stringify({
                    event_type: 'result_view',
                    vendor_id: hydrated.vendorId || branding.id || 'XP-PUBLIC',
                    session_id: localStorage.getItem('axp_session_id'),
                    device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                })
            }).catch(() => {});
        } catch (_e) {}

        if (hydrated.vendorId) {
            const arenaBtn = document.getElementById('goToArenaBtn');
            if (arenaBtn) {
                arenaBtn.onclick = () => {
                    window.location.href = 'stats.html';
                };
            }
        }
        applyResultLang();
        window.addEventListener('xp:language-change', applyResultLang);

        document.getElementById('idModel').textContent = modelText;
        document.getElementById('creatorName').textContent = displayName;
        document.getElementById('creatorAdvice').textContent = hydrated.advice || 'OPTIMIZED FOR COMPETITIVE PLAY';
        document.getElementById('chipVendor').textContent = displayName.toUpperCase();
        document.getElementById('chipStatus').textContent = hydrated.validUntil ? t('activeTimed', 'ACTIVE / TIMED') : t('activeOpen', 'ACTIVE / OPEN');
        document.getElementById('devicePreview').src = AXP_LOGO;
        document.getElementById('notesAvatar').src = AXP_LOGO;
        document.getElementById('creatorLogo').src = AXP_LOGO;
        currentAdvice = hydrated.advice || '';
        updateAdviceCopy(hydrated.advice);
        updateShareHint();

        document.getElementById('idGeneral').textContent = results.general || '--';
        document.getElementById('idRedDot').textContent = results.redDot || '--';
        document.getElementById('id2x').textContent = results.scope2x || '--';
        document.getElementById('id4x').textContent = results.scope4x || '--';
        document.getElementById('idSniper').textContent = results.sniperScope || '--';
        document.getElementById('idFreeLook').textContent = results.freeLook || '--';
        document.getElementById('idDPI').textContent = results.dpi || 'DEFAULT';
        
        // Trigger cascading animation for results
        setTimeout(() => {
            document.querySelectorAll('.result-stat').forEach((stat, idx) => {
                stat.style.animation = `scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.1}s both`;
                GamingEffects.createParticles(stat, 3, 'cyan');
            });
            GamingEffects.showSuccess('PROFILE_DECRYPTED_SUCCESSFULLY');
        }, 300);
        const toggle = document.getElementById('precisionToggle');
        if (toggle) {
            toggle.checked = isPrecise;
            toggle.onchange = (e) => {
                isPrecise = e.target.checked;
                localStorage.setItem('axp_precise_mode', isPrecise);
                updateDisplayValues();
                if (window.SFX) window.SFX.play('click');
                window.notify?.(isPrecise ? 'PRECISE_MODE_ACTIVE' : 'RANGE_MODE_ACTIVE', 'info');
            };
        }

        updateDisplayValues();
        setEfficiency(inferEfficiency(results));
        setExpiryState(hydrated.validUntil);

        currentShareDetails = buildCardDetails({ branding, hydrated, modelText, displayName, code, results });
        updateShareCard(currentShareDetails);
        
        const rail = document.getElementById('codeRailText');
        if (rail) rail.textContent = currentShareDetails.code;

        if (branding.colors?.primary) document.documentElement.style.setProperty('--accent-primary', branding.colors.primary);
        if (branding.colors?.secondary) document.documentElement.style.setProperty('--accent-secondary', branding.colors.secondary);
        if (branding.css_vars && typeof branding.css_vars === 'object') {
            Object.entries(branding.css_vars).forEach(([key, value]) => {
                if (typeof value === 'string') document.documentElement.style.setProperty(key, value);
            });
        }

        document.getElementById('downloadBtn').addEventListener('click', async () => {
            const btn = document.getElementById('downloadBtn');
            const originalText = btn.textContent;
            try {
                btn.disabled = true;
                btn.textContent = 'EXPORTING...';
                GamingEffects.showLoadingBar(800);
                await exportShareCardImage(currentShareDetails, `xp-id-${code}.png`);
                GamingEffects.createParticles(btn, 20, 'gold');
                GamingEffects.showSuccess('ID Card Exported!');
                window.notify?.('ID_CARD_EXPORTED', 'success');
            } catch (e) {
                console.error('EXPORT_ERR:', e);
                GamingEffects.showError('Export Failed');
                window.notify?.('EXPORT_FAILED', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            GamingEffects.screenGlitch(100);
            copyPlainText(currentShareDetails.code, 'ACCESS_CODE_COPIED');
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            GamingEffects.screenGlitch(100);
            const text = buildShareText({
                modelText,
                general: results.general || '--',
                redDot: results.redDot || '--',
                dpi: results.dpi || 'DEFAULT',
                efficiency: currentEfficiency,
                shareUrl: currentShareUrl,
                code: currentShareToken ? '' : code
            });
            const afterCopy = () => {
                try {
                    fetch('/api/vault/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'copy_text', code })
                    });
                } catch (_e) {}
                window.notify?.('PROFILE_COPIED_TO_CLIPBOARD', 'haptic');
            };
            if (navigator.share) {
                navigator.share({ title: 'AXP Calibration Profile', text, url: currentShareUrl || undefined })
                    .then(afterCopy)
                    .catch(() => navigator.clipboard.writeText(text).then(afterCopy));
            } else {
                navigator.clipboard.writeText(text).then(afterCopy);
            }
        });

        bindMotionEffects();
    });
})();
