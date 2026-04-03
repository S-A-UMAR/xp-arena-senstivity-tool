(function () {
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

    function storeLastResult(payload, fallbackBranding) {
        localStorage.setItem('xp_last_entry_code', currentCode);
        localStorage.setItem(
            'xp_sensitivity_profile_last_result',
            JSON.stringify({ ...(payload.sensitivity || payload.results || {}), advice: payload.advice || payload.sensitivity?.advice || '' })
        );
        localStorage.setItem('xp_last_branding', JSON.stringify(payload.branding || fallbackBranding || {}));
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
        const lang = localStorage.getItem('xp_lang') || 'en';
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
            if (!response.ok) throw new Error(payload.error || payload.message || 'STATUS_REFRESH_FAILED');
            currentVerifyPayload = payload;
            currentCode = payload.entry_code || code || '';
            currentShareToken = payload.share_token || shareToken || '';
            currentShareUrl = buildResultUrl({ code: currentCode, shareToken: currentShareToken });

            storeLastResult(payload, fallbackBranding);

            return buildHydratedState({ payload, fallbackResults, fallbackBranding });
        } catch (e) {
            console.warn('STATUS_REFRESH_ERR:', e);
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

    function paintRange(id1, id2, val) {
        const [a, b] = parseRange(val);
        document.getElementById(id1).textContent = a;
        document.getElementById(id2).textContent = b;
    }

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
        document.getElementById('shareUtc').textContent = `${t('currentUtcLabel', 'CURRENT UTC')}: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
        document.getElementById('shareExpiry').textContent = `${t('expiryLabel', 'EXPIRY')}: ${details.expiry}`;
        document.getElementById('shareEfficiencyBar').style.width = `${details.efficiency}%`;
        document.getElementById('shareEfficiencyLabel').textContent = `${t('profileEfficiencyText', 'PROFILE_EFFICIENCY')}: ${details.efficiency}%`;
        document.getElementById('shareDeviceModel').textContent = details.model;
        document.getElementById('shareCreatorName').textContent = `${t('unitIdLabel', 'UNIT_ID')}: ${details.creator}`;
        document.getElementById('shareAccessCode').textContent = details.code;
        document.getElementById('shareGeneral').textContent = details.general;
        document.getElementById('shareRedDot').textContent = details.redDot;
        document.getElementById('shareScope').textContent = details.scope;
        document.getElementById('shareDpiEff').textContent = `${details.dpi} • ${details.efficiency}%`;
        document.getElementById('shareTrendGeneral').textContent = details.trendGeneral;
        document.getElementById('shareTrendRed').textContent = details.trendRed;
        document.getElementById('shareTrendScope').textContent = details.trendScope;
        document.getElementById('shareAdvice').textContent = `${t('settingsByLabel', 'SETTINGS_BY')} ${details.creator}: ${details.advice}`;
        document.getElementById('shareVerified').textContent = `${t('verifiedLabel', 'VERIFIED')} ${details.efficiency}%`;
    }

    function formatAccessCode(vendor, code) {
        return code || 'FREE-GEN';
    }

    function buildCardDetails({ branding, hydrated, modelText, displayName, code, results }) {
        const generalRange = `${document.getElementById('rGen1').textContent} — ${document.getElementById('rGen2').textContent}`;
        const redDotRange = `${document.getElementById('rRed1').textContent} — ${document.getElementById('rRed2').textContent}`;
        const scopeRange = `${document.getElementById('r2x1').textContent} — ${document.getElementById('r4x2').textContent}`;
        
        const formattedCode = formatAccessCode(displayName, currentCode || code);

        return {
            logo: branding.logo_url || branding.logo || 'favicon.png',
            expiry: hydrated.validUntil ? document.getElementById('expiryValue').textContent : 'NEVER',
            efficiency: currentEfficiency,
            model: modelText,
            creator: displayName,
            code: formattedCode,
            general: generalRange,
            redDot: redDotRange,
            scope: scopeRange,
            dpi: results.dpi || 'DEFAULT',
            trendGeneral: document.getElementById('trendGeneral').textContent,
            trendRed: document.getElementById('trendRed').textContent,
            trendScope: document.getElementById('trend4x').textContent,
            advice: hydrated.advice || 'OPTIMIZED FOR COMPETITIVE PLAY'
        };
    }

    async function exportShareCardImage(details, filename) {
        if (window.html2canvas) {
            const area = document.getElementById('shareCaptureArea');
            if (!area) throw new Error('CAPTURE_AREA_NOT_FOUND');
            
            // Temporary styles to ensure clean capture
            const originalStyle = area.getAttribute('style') || '';
            area.style.transform = 'none';
            area.style.position = 'fixed';
            area.style.top = '-9999px';
            area.style.left = '-9999px';
            area.style.display = 'block';
            
            try {
                const canvas = await window.html2canvas(area, { 
                    scale: 2, 
                    backgroundColor: '#0b1421',
                    useCORS: true,
                    allowTaint: true,
                    logging: false
                });
                
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            } finally {
                area.setAttribute('style', originalStyle);
            }
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1600;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('CARD_EXPORT_UNAVAILABLE');

        ctx.fillStyle = '#09131c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const drawRoundedRect = (x, y, w, h, r, fill, stroke = null) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };

        drawRoundedRect(26, 26, 1548, 1548, 42, '#0b1722', '#152635');
        drawRoundedRect(42, 42, 1516, 1516, 36, '#0c1824', '#132434');

        ctx.fillStyle = '#f4f7fb';
        ctx.font = '700 64px "JetBrains Mono", monospace';
        ctx.fillText('XP_ARENA', 225, 105);
        ctx.fillStyle = '#90a4b7';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText('PREMIUM SHARE CARD', 225, 165);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#dce7f2';
        ctx.font = '600 26px "JetBrains Mono", monospace';
        ctx.fillText(`${t('currentUtcLabel', 'CURRENT UTC')}: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`, 1510, 105);
        ctx.fillText(`${t('expiryLabel', 'EXPIRY')}: ${details.expiry}`, 1510, 155);
        drawRoundedRect(890, 185, 620, 26, 13, '#213547');
        const efficiencyWidth = Math.max(0, Math.min(620, (620 * (details.efficiency || 0)) / 100));
        drawRoundedRect(890, 185, efficiencyWidth, 26, 13, '#6fd9ff');
        ctx.fillText(`${t('profileEfficiencyText', 'PROFILE_EFFICIENCY')}: ${details.efficiency}%`, 1510, 255);
        ctx.textAlign = 'left';

        drawRoundedRect(84, 296, 1432, 294, 36, '#1a2938', '#24384c');
        drawRoundedRect(90, 332, 208, 220, 28, '#ffffff', '#dce8f4');
        ctx.fillStyle = '#95aabd';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText('DEVICE_PROFILE', 326, 390);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 62px "JetBrains Mono", monospace';
        ctx.fillText(details.model, 326, 468);
        ctx.font = '600 34px "JetBrains Mono", monospace';
        ctx.fillText(`${t('unitIdLabel', 'UNIT_ID')}: ${details.creator}`, 326, 530);

        drawRoundedRect(84, 626, 1432, 168, 30, '#1d2d3d', '#26394d');
        ctx.fillStyle = '#8ea2b6';
        ctx.font = '600 22px "JetBrains Mono", monospace';
        ctx.fillText('ACCESS_CODE', 120, 684);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 42px "JetBrains Mono", monospace';
        ctx.fillText(details.code, 120, 748);
        drawRoundedRect(1218, 676, 282, 70, 35, '#1f423c', '#2b5f57');
        ctx.fillStyle = '#8cf1ca';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText(t('syncedProfile', 'SYNCED_PROFILE'), 1260, 722);

        const cards = [
            { x: 84, y: 822, title: 'GENERAL_SENS', value: details.general, trend: details.trendGeneral, icon: '↑', accent: '#8ff0cf' },
            { x: 816, y: 822, title: 'RED_DOT_PRECISION', value: details.redDot, trend: details.trendRed, icon: '↑', accent: '#ff8ca0' },
            { x: 84, y: 1102, title: '2X / 4X_SCOPE', value: details.scope, trend: details.trendScope, icon: '↘', accent: '#87dfff' },
            { x: 816, y: 1102, title: 'DPI / EFFICIENCY', value: `${details.dpi} • ${details.efficiency}%`, trend: 'TREND: LIVE_SYNCED', icon: '◎', accent: '#9df0e1' }
        ];

        cards.forEach((card) => {
            drawRoundedRect(card.x, card.y, 700, 212, 30, '#101820', '#1b2d40');
            ctx.fillStyle = '#91a7bc';
            ctx.font = '600 24px "JetBrains Mono", monospace';
            ctx.fillText(card.title, card.x + 36, card.y + 56);
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 74px "JetBrains Mono", monospace';
            ctx.fillText(card.value, card.x + 36, card.y + 150);
            ctx.fillStyle = '#96a9bc';
            ctx.font = '600 24px "JetBrains Mono", monospace';
            ctx.fillText(card.trend, card.x + 36, card.y + 196);
            ctx.fillStyle = card.accent;
            ctx.font = '700 56px "JetBrains Mono", monospace';
            ctx.fillText(card.icon, card.x + 620, card.y + 90);
        });

        drawRoundedRect(84, 1380, 1432, 156, 30, '#111b24', '#203344');
        ctx.fillStyle = '#90a4b7';
        ctx.font = '600 22px "JetBrains Mono", monospace';
        ctx.fillText(t('settingsByLabel', 'SETTINGS BY'), 298, 1444);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 34px "JetBrains Mono", monospace';
        ctx.fillText(`${t('settingsByLabel', 'SETTINGS BY')} ${details.creator}: ${details.advice}`, 298, 1496);
        drawRoundedRect(1240, 1434, 228, 72, 36, '#173b36', '#295f57');
        ctx.fillStyle = '#8af0c7';
        ctx.font = '600 24px "JetBrains Mono", monospace';
        ctx.fillText(`${t('verifiedLabel', 'VERIFIED')} ${details.efficiency}%`, 1274, 1480);

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
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
        if (chipMode) chipMode.textContent = t('viewExportMode', 'VIEW / EXPORT');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        startUtcClock();
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                updateUtcClock();
                setExpiryState(currentVerifyPayload?.valid_until || currentVerifyPayload?.validUntil || currentVerifyPayload?.valid_until || null);
            }
        });

        const params = new URLSearchParams(window.location.search);
        const fallbackResults = JSON.parse(localStorage.getItem('xp_sensitivity_profile_last_result') || '{}');
        const state = JSON.parse(localStorage.getItem('xp_sensitivity_profile') || '{}');
        const fallbackBranding = JSON.parse(localStorage.getItem('xp_last_branding') || '{}');
        currentCode = params.get('code') || localStorage.getItem('xp_last_entry_code') || '';
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

        window.SaaSAnalytics?.track('result_view');
        try {
            fetch('/api/vault/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'result_view',
                    vendor_id: hydrated.vendorId || branding.id || 'XP-PUBLIC',
                    session_id: localStorage.getItem('xp_session_id'),
                    device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                })
            });
        } catch (_e) {}

        if (hydrated.vendorId) {
            const arenaBtn = document.getElementById('goToArenaBtn');
            if (arenaBtn) {
                arenaBtn.onclick = () => {
                    window.location.href = `/arena.html?vendor=${hydrated.vendorId}`;
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
        document.getElementById('devicePreview').src = branding.logo_url || branding.logo || 'favicon.png';
        document.getElementById('notesAvatar').src = branding.logo_url || branding.logo || 'favicon.png';
        if (branding.logo_url || branding.logo) document.getElementById('creatorLogo').src = branding.logo_url || branding.logo;
        currentAdvice = hydrated.advice || '';
        updateAdviceCopy(hydrated.advice);
        updateShareHint();

        paintRange('rGen1', 'rGen2', results.general);
        paintRange('rRed1', 'rRed2', results.redDot);
        
        // 💎 Enhanced Logic: Show 2X Low and 4X High in the merged Scope Card
        const [r2xLow] = parseRange(results.scope2x);
        const [_, r4xHigh] = parseRange(results.scope4x);
        document.getElementById('r2x1').textContent = r2xLow;
        document.getElementById('r4x2').textContent = r4xHigh;
        
        applyTrendLine('trendGeneral', results.general);
        applyTrendLine('trendRed', results.redDot);
        applyTrendLine('trend4x', results.scope4x);
        
        document.getElementById('idDPI').textContent = results.dpi || 'DEFAULT';
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
                await exportShareCardImage(currentShareDetails, `xp-id-${code}.png`);
                window.notify?.('ID_CARD_EXPORTED', 'success');
            } catch (e) {
                console.error('EXPORT_ERR:', e);
                window.notify?.('EXPORT_FAILED', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            copyPlainText(currentShareDetails.code, 'ACCESS_CODE_COPIED');
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            const generalRange = `${document.getElementById('rGen1').textContent} — ${document.getElementById('rGen2').textContent}`;
            const redDotRange = `${document.getElementById('rRed1').textContent} — ${document.getElementById('rRed2').textContent}`;
            const text = buildShareText({
                modelText,
                general: generalRange,
                redDot: redDotRange,
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
                navigator.share({ title: 'XP ARENA Calibration Profile', text, url: currentShareUrl || undefined })
                    .then(afterCopy)
                    .catch(() => navigator.clipboard.writeText(text).then(afterCopy));
            } else {
                navigator.clipboard.writeText(text).then(afterCopy);
            }
        });

        bindMotionEffects();
    });
})();
