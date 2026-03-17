/**
 * XP ARENA - Professional Notification System
 * Replaces browser-default alert() and confirm()
 */

const XP_NOTIFY = {
    init() {
        if (document.getElementById('xpNotifyContainer')) return;
        const container = document.createElement('div');
        container.id = 'xpNotifyContainer';
        container.className = 'xp-notify-container';
        document.body.appendChild(container);
    },

    /**
     * Show a toast notification
     * @param {string} message 
     * @param {'info'|'success'|'error'|'warning'} type 
     * @param {number} duration 
     */
    show(message, type = 'info', duration = 3000) {
        this.init();
        const container = document.getElementById('xpNotifyContainer');
        
        const toast = document.createElement('div');
        toast.className = `xp-toast xp-toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="xp-toast-content">
                <span class="xp-toast-icon">${icon}</span>
                <span class="xp-toast-message">${message}</span>
            </div>
            <div class="xp-toast-progress"></div>
        `;
        
        container.appendChild(toast);

        // Play sound if available
        if (window.SFX) {
            if (type === 'error') window.SFX.play('click');
            else window.SFX.play('ping');
        }

        // Trigger animation
        setTimeout(() => toast.classList.add('px-toast-visible'), 10);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('px-toast-visible');
            toast.classList.add('px-toast-exit');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    getIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    }
};

// Global helper for easy access
window.notify = (msg, type, dur) => XP_NOTIFY.show(msg, type, dur);
