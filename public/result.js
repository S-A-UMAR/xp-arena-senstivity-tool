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
    let likeInFlight = false;
    let selectedFeedbackTag = 'feels_good';
    let expiryTimer = null;
    let utcInterval = null;
    let currentDisplayName = '';
    let currentAdvice = '';
    let currentShareDetails = null;

    function likedStorageKey(code) {
        return `xp_liked_${String(code || '').toUpperCase()}`;
    }

    function feedbackStorageKey(code) {
        return `xp_feedback_${String(code || '').toUpperCase()}`;
    }

    function currentEngagementKey() {
        return currentCode || currentShareToken || '';
    }

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

    function setLikeButtonState(liked, count) {
        const likeBtn = document.getElementById('likeBtn');
        if (!likeBtn) return;
        const actionLabel = liked ? t('likedLabel', 'LIKED') : t('likeLabel', 'LIKE');
        likeBtn.textContent = `${liked ? '💚' : '❤️'} ${actionLabel} (${count || 0})`;
        likeBtn.classList.toggle('liked', liked);
        likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
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
        if (!el || a === '--') return;
        const avg = (a + b) / 2;
        if (avg >= 170) el.textContent = 'TREND: OPTIMIZING';
        else if (avg >= 145) el.textContent = 'TREND: STABLE';
        else el.textContent = 'TREND: FINE-TUNING';
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

    function buildCardDetails({ branding, hydrated, modelText, displayName, code, results }) {
        const generalRange = `${document.getElementById('rGen1').textContent} — ${document.getElementById('rGen2').textContent}`;
        const redDotRange = `${document.getElementById('rRed1').textContent} — ${document.getElementById('rRed2').textContent}`;
        const scopeRange = `${document.getElementById('r2x1').textContent} — ${document.getElementById('r4x2').textContent}`;
        return {
            logo: branding.logo_url || branding.logo || 'favicon.png',
            expiry: hydrated.validUntil ? document.getElementById('expiryValue').textContent : 'NEVER',
            efficiency: currentEfficiency,
            model: modelText,
            creator: displayName,
            code: currentCode || currentShareUrl || code,
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
            const canvas = await window.html2canvas(area, { scale: 2, backgroundColor: '#0b1620' });
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
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

    function setFeedbackTag(tag) {
        selectedFeedbackTag = tag;
        document.querySelectorAll('[data-feedback-tag]').forEach((button) => {
            button.classList.toggle('active', button.dataset.feedbackTag === tag);
        });
    }

    function setFeedbackStatus(message, tone = '') {
        const el = document.getElementById('feedbackStatus');
        if (!el) return;
        el.textContent = message || '';
        el.dataset.tone = tone;
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

    async function submitFeedback({ rating, source, isLike = false }) {
        if ((!currentCode && !currentShareToken) || likeInFlight) return;
        const feedbackText = (document.getElementById('feedbackText')?.value || '').trim();
        try {
            likeInFlight = true;
            setFeedbackStatus('');
            const response = await fetch('/api/vault/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: currentCode || undefined,
                    share_token: !currentCode && currentShareToken ? currentShareToken : undefined,
                    rating,
                    feedback: feedbackText || undefined,
                    feedback_tag: selectedFeedbackTag,
                    feedback_source: source
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || payload.message || 'FEEDBACK_FAILED');
            if (isLike) {
                localStorage.setItem(likedStorageKey(currentEngagementKey()), 'true');
                setLikeButtonState(true, payload.likes_count || 0);
                window.notify?.(t('likeRecorded', 'LIKE_RECORDED'), 'success');
            } else {
                localStorage.setItem(feedbackStorageKey(currentEngagementKey()), JSON.stringify({ rating, tag: selectedFeedbackTag, feedbackText }));
                setLikeButtonState(localStorage.getItem(likedStorageKey(currentEngagementKey())) === 'true', payload.likes_count || 0);
                setFeedbackStatus(t('feedbackSaved', 'FEEDBACK_SAVED'), 'success');
                window.notify?.(t('feedbackSaved', 'FEEDBACK_SAVED'), 'success');
            }
        } catch (e) {
            const message = e.message || 'FEEDBACK_FAILED';
            if (isLike && message === 'FEEDBACK_ALREADY_CAPTURED_RECENTLY') {
                setLikeButtonState(true, currentVerifyPayload?.likes || 0);
            }
            setFeedbackStatus(message, 'error');
            window.notify?.(message, 'error');
        } finally {
            likeInFlight = false;
        }
    }

    async function submitLike() {
        if (!currentCode && !currentShareToken) return;
        if (localStorage.getItem(likedStorageKey(currentEngagementKey())) === 'true') {
            window.notify?.(t('likeAlreadyRecorded', 'LIKE_ALREADY_RECORDED'), 'info');
            return;
        }
        await submitFeedback({ rating: 5, source: 'quick_like', isLike: true });
    }

    function bindStructuredFeedback() {
        document.querySelectorAll('[data-feedback-tag]').forEach((button) => {
            button.addEventListener('click', () => setFeedbackTag(button.dataset.feedbackTag));
        });
        setFeedbackTag(selectedFeedbackTag);
        document.getElementById('submitFeedbackBtn')?.addEventListener('click', async () => {
            const rating = Number.parseInt(document.getElementById('feedbackRating')?.value || '4', 10);
            await submitFeedback({ rating, source: 'structured_feedback' });
        });
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
        const submitBtn = document.getElementById('submitFeedbackBtn');
        if (submitBtn) submitBtn.textContent = t('submitFeedback', 'SEND_FEEDBACK');
        const rail = document.getElementById('codeRailText');
        if (rail && (currentCode || currentShareUrl)) {
            rail.textContent = currentCode
                ? `[${t('redactedCode', 'REDACTED_CODE')}] ${currentCode}`
                : `[${t('secureShareLink', 'SECURE_SHARE_LINK')}] ${currentShareUrl}`;
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

        applyResultLang();
        window.addEventListener('xp:language-change', applyResultLang);

        document.getElementById('idModel').textContent = modelText;
        document.getElementById('codeRailText').textContent = currentCode
            ? `[${t('redactedCode', 'REDACTED_CODE')}] ${code}`
            : `[${t('secureShareLink', 'SECURE_SHARE_LINK')}] ${currentShareUrl}`;
        document.getElementById('creatorName').textContent = displayName;
        document.getElementById('settingsBy').textContent = `${t('settingsByLabel', 'SETTINGS BY')}: ${displayName} 👾`;
        document.getElementById('chipVendor').textContent = displayName.toUpperCase();
        document.getElementById('chipStatus').textContent = hydrated.validUntil ? t('activeTimed', 'ACTIVE / TIMED') : t('activeOpen', 'ACTIVE / OPEN');
        document.getElementById('devicePreview').src = branding.logo_url || branding.logo || 'favicon.png';
        document.getElementById('notesAvatar').src = branding.logo_url || branding.logo || 'favicon.png';
        if (branding.logo_url || branding.logo) document.getElementById('creatorLogo').src = branding.logo_url || branding.logo;
        currentAdvice = hydrated.advice || '';
        updateAdviceCopy(hydrated.advice);
        updateShareHint();

        const liked = localStorage.getItem(likedStorageKey(currentEngagementKey())) === 'true';
        setLikeButtonState(liked, hydrated.likes || 0);

        paintRange('rGen1', 'rGen2', results.general);
        paintRange('rRed1', 'rRed2', results.redDot);
        paintRange('r2x1', 'r2x2', results.scope2x);
        paintRange('r4x1', 'r4x2', results.scope4x);
        paintRange('rSni1', 'rSni2', results.sniperScope || results.sniper);
        paintRange('rAds1', 'rAds2', results.ads);
        document.getElementById('idDPI').textContent = results.dpi || 'DEFAULT';
        applyTrendLine('trendGeneral', results.general);
        applyTrendLine('trendRed', results.redDot);
        applyTrendLine('trend2x', results.scope2x);
        applyTrendLine('trend4x', results.scope4x);
        applyTrendLine('trendAds', results.ads);
        applyTrendLine('trendSni', results.sniperScope || results.sniper);
        setEfficiency(inferEfficiency(results));
        setExpiryState(hydrated.validUntil);

        currentShareDetails = buildCardDetails({ branding, hydrated, modelText, displayName, code, results });
        const generalRange = currentShareDetails.general;
        const redDotRange = currentShareDetails.redDot;
        updateShareCard(currentShareDetails);

        const socialBox = document.getElementById('socialLinks');
        const socialsObj = branding.socials || {};
        const socials = [
            { id: 'youtube', icon: 'YouTube', link: branding.youtube || socialsObj.yt },
            { id: 'tiktok', icon: 'TikTok', link: branding.tiktok || socialsObj.tiktok || socialsObj.tt },
            { id: 'discord', icon: 'Discord', link: branding.discord || socialsObj.discord || socialsObj.dc }
        ];
        const socialIcons = {
            youtube: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
            tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.25-1.33 2.1-.1.7-.01 1.42.24 2.08.41.82 1.25 1.39 2.16 1.47 1.05.07 2.13-.37 2.74-1.23.33-.42.5-1.01.51-1.54-.01-4.73.01-9.46-.02-14.2z"/></svg>`,
            discord: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.052-.102.001-.226-.106-.267a12.865 12.865 0 0 1-1.887-.899.08.08 0 0 1-.006-.136c.125-.094.252-.192.372-.29a.078.078 0 0 1 .082-.011 13.973 13.973 0 0 0 12.244 0 .078.078 0 0 1 .082.011c.12.098.247.196.373.29a.08.08 0 0 1-.006.136 12.655 12.655 0 0 1-1.887.899.076.076 0 0 0-.105.268c.352.699.765 1.362 1.227 1.993a.076.076 0 0 0 .084.029 19.835 19.835 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
        };
        socials.forEach((s) => {
            if (s.link) {
                const a = document.createElement('a');
                a.href = s.link.startsWith('http') ? s.link : `https://${s.link}`;
                a.target = '_blank';
                a.className = `social-link ${s.id}`;
                a.innerHTML = `${socialIcons[s.id]}<span>${s.icon}</span>`;
                socialBox.appendChild(a);
            }
        });
        const tiktok = socials.find((s) => s.id === 'tiktok' && s.link);
        if (tiktok) document.getElementById('followHint').textContent = `${t('followCreator', 'FOLLOW_CREATOR')}: ${tiktok.link}`;

        const followBtn = document.getElementById('followBtn');
        const primarySocial = socials.find((s) => s.link)?.link;
        if (primarySocial || branding.social_link) {
            const primaryLink = primarySocial || branding.social_link;
            followBtn.onclick = () => window.open(primaryLink.startsWith('http') ? primaryLink : `https://${primaryLink}`, '_blank');
        } else {
            followBtn.textContent = t('joinCommunity', 'JOIN_COMMUNITY');
            followBtn.onclick = () => window.open('https://discord.gg/xparena', '_blank');
        }

        if (branding.colors?.primary) document.documentElement.style.setProperty('--accent-primary', branding.colors.primary);
        if (branding.colors?.secondary) document.documentElement.style.setProperty('--accent-secondary', branding.colors.secondary);
        if (branding.css_vars && typeof branding.css_vars === 'object') {
            Object.entries(branding.css_vars).forEach(([key, value]) => {
                if (typeof value === 'string') document.documentElement.style.setProperty(key, value);
            });
        }

        document.getElementById('downloadBtn').addEventListener('click', async () => {
            await exportShareCardImage(currentShareDetails, `xp-id-${code}.png`);
            window.notify?.('ID_CARD_EXPORTED', 'success');
        });

        document.getElementById('copyCodeBtn').addEventListener('click', () => copyPlainText(currentCode || currentShareUrl || code, 'ACCESS_CODE_COPIED'));
        document.getElementById('likeBtn').addEventListener('click', submitLike);
        bindStructuredFeedback();

        document.getElementById('copyBtn').addEventListener('click', () => {
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
