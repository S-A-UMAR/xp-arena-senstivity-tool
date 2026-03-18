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
            z-index: 9999;
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
        info: '#ffffff'
    };
    
    const color = colors[type] || colors.info;
    const isHaptic = type === 'haptic';
    
    toast.className = isHaptic ? 'haptic' : '';
    toast.style.cssText = `
        background: ${isHaptic ? 'rgba(0, 240, 255, 0.1)' : 'rgba(15, 23, 42, 0.9)'};
        backdrop-filter: blur(10px);
        border: 1px solid ${isHaptic ? 'var(--accent-primary)' : color + '44'};
        border-left: 4px solid ${isHaptic ? 'var(--accent-primary)' : color};
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: #fff;
        font-family: ${isHaptic ? "'JetBrains Mono', monospace" : "'Inter', sans-serif"};
        font-weight: 700;
        font-size: 0.85rem;
        box-shadow: 0 10px 30px ${isHaptic ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0,0,0,0.5)'};
        pointer-events: auto;
        animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        display: flex;
        justify-content: space-between;
        align-items: center;
        letter-spacing: ${isHaptic ? '0.1em' : 'normal'};
    `;

    toast.innerHTML = `
        <span>${message.toUpperCase()}</span>
        <div style="font-size: 0.6rem; opacity: 0.5; font-family: 'JetBrains Mono'; margin-left: 1rem;">${isHaptic ? 'HAPTIC_FEEDBACK' : 'SECURE_MSG'}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 400);
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
