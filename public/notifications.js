window.notify = function(message, type = 'info', duration = 4000) {
    let container = document.getElementById('notify-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notify-container';
        container.style.cssText = `
            position: fixed;
            top: calc(env(safe-area-inset-top, 0px) + 0.85rem);
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
            width: min(92vw, 420px);
            max-width: 420px;
            padding: 0 0.4rem;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: '#00f0ff',
        error: '#ff3366',
        warning: '#ffaa00',
        info: '#ffffff',
        haptic: '#00f0ff'
    };
    
    const color = colors[type] || colors.info;
    const isError = type === 'error';
    
    toast.className = `xp-toast ${type}`;
    toast.style.cssText = `
        background: rgba(8, 10, 15, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid ${color}44;
        border-top: 2px solid ${color};
        padding: 1.25rem;
        border-radius: 16px;
        color: #fff;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
        font-size: 0.75rem;
        line-height: 1.4;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6), inset 0 0 20px ${color}11;
        pointer-events: auto;
        animation: toastEntrance 0.6s cubic-bezier(0.2, 1, 0.3, 1) both;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 8px;
        word-break: break-word;
        overflow-wrap: anywhere;
    `;

    // Sparkles / Glitch Effect for Errors
    const effects = isError ? `
        <div class="glitch-line"></div>
        <div class="sparkles"></div>
    ` : '';

    toast.innerHTML = `
        ${effects}
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 0.5rem;">
            <div style="display:flex; align-items:flex-start; gap: 12px; min-width:0;">
                <div class="status-indicator" style="background: ${color}; box-shadow: 0 0 15px ${color};"></div>
                <span style="letter-spacing: 0.08em; text-shadow: 0 0 10px ${color}44; min-width:0;">${message.toUpperCase()}</span>
            </div>
            <div class="toast-type-tag">${type.toUpperCase()}</div>
        </div>
        <div class="toast-progress-bar" style="background: ${color}"></div>
    `;

    // Add Sparkles randomly if error
    if (isError) {
        for(let i=0; i<15; i++) {
            const s = document.createElement('div');
            s.className = 'sparkle';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.animationDelay = Math.random() * 2 + 's';
            toast.appendChild(s);
        }
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastExit 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 500);
    }, duration);
};

// Advanced Styles for Notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes toastEntrance {
        0% { opacity: 0; transform: translateY(-30px) scale(0.9) rotateX(-10deg); filter: blur(10px); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
    }
    @keyframes toastExit {
        to { opacity: 0; transform: translateY(-20px) scale(0.95); filter: blur(10px); }
    }
    .xp-toast .status-indicator {
        width: 10px; height: 10px; border-radius: 50%;
        animation: pulseIndicator 2s infinite;
    }
    @keyframes pulseIndicator {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
    }
    .toast-type-tag {
        font-size: 0.5rem; opacity: 0.4; padding: 2px 6px; 
        border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
    }
    .toast-progress-bar {
        position: absolute; bottom: 0; left: 0; height: 2px; width: 100%;
        transform-origin: left;
        animation: toastProgress 4s linear forwards;
    }
    @keyframes toastProgress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }
    .sparkle {
        position: absolute; width: 2px; height: 2px; background: #fff;
        border-radius: 50%; opacity: 0;
        animation: sparkleAnim 2s infinite;
    }
    @keyframes sparkleAnim {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.5); opacity: 0.8; }
        100% { transform: scale(0); opacity: 0; }
    }
    .glitch-line {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(transparent, rgba(255,51,102,0.05), transparent);
        animation: glitchMove 4s infinite linear;
        pointer-events: none;
    }
    @keyframes glitchMove {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
    }
    @media (max-width: 520px) {
        #notify-container {
            width: min(94vw, 420px) !important;
            top: calc(env(safe-area-inset-top, 0px) + 0.5rem) !important;
        }
        .xp-toast {
            font-size: 0.68rem !important;
            padding: 0.9rem !important;
        }
        .toast-type-tag {
            display: none;
        }
    }
`;
document.head.appendChild(style);
