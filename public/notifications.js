window.notify = function(message, type = 'info', duration = 3000) {
    let container = document.getElementById('notify-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notify-container';
        container.style.cssText = `
            position: fixed;
            top: 2rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
            width: 90%;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: '#00f0ff',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#ffffff',
        haptic: '#00f0ff'
    };
    
    const color = colors[type] || colors.info;
    const isHaptic = type === 'haptic';
    
    toast.className = isHaptic ? 'haptic' : '';
    toast.style.cssText = `
        background: ${isHaptic ? 'rgba(0, 240, 255, 0.1)' : 'rgba(8, 10, 14, 0.95)'};
        backdrop-filter: blur(12px);
        border: 1px solid ${isHaptic ? 'var(--accent-primary)' : color + '33'};
        border-left: 4px solid ${color};
        padding: 1rem 1.25rem;
        border-radius: 14px;
        color: #fff;
        font-family: ${isHaptic ? "'JetBrains Mono', monospace" : "'Inter', sans-serif"};
        font-weight: 800;
        font-size: 0.75rem;
        box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        pointer-events: auto;
        animation: toastSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        display: flex;
        justify-content: space-between;
        align-items: center;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    `;

    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap: 10px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 8px ${color};"></div>
            <span>${message.toUpperCase()}</span>
        </div>
        <div style="font-size: 0.55rem; opacity: 0.4; font-family: 'JetBrains Mono'; letter-spacing: 0.1em;">${isHaptic ? 'HAPTIC' : 'UPLINK'}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 500);
    }, duration);
};

// Add animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes toastSlideOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(-20px) scale(0.95); }
    }
`;
document.head.appendChild(style);
