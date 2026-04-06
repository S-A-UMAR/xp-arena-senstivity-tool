/**
 * AXP - SAAS ANALYTICS ENGINE
 * Powered by Neural Conversion Tracking
 */
const SaaSAnalytics = {
    sessionId: Math.random().toString(36).substring(2, 15),

    async track(eventType) {
        try {
            const profile = JSON.parse(localStorage.getItem('xp_sensitivity_profile') || '{}');
            await fetch('/api/vault/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: eventType,
                    vendor_id: profile.vendor || 'XP-CORE',
                    session_id: this.sessionId,
                    device: profile.model || 'Unknown'
                })
            });
        } catch (e) {
            console.warn('TRACK_SILENT_FAIL:', e);
        }
    }
};

window.SaaSAnalytics = SaaSAnalytics;
document.addEventListener('DOMContentLoaded', () => {
    // Auto-track landing view
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        SaaSAnalytics.track('landing_view');
    }
});
