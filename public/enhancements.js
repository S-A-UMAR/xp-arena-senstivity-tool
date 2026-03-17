/**
 * XP ARENA - Premium Enhancements Engine
 */

const XP_ENHANCE = {
    init() {
        this.detectDevice();
        this.initPulseTicker();
        this.initRecoilPreview();
        this.setupPWAInstall();
    },

    detectDevice() {
        const ua = navigator.userAgent;
        let model = "MOBILE_UNIT_DETECTED";
        
        if (ua.match(/iPhone/i)) model = "IPHONE_STATION_ACTIVE";
        else if (ua.match(/iPad/i)) model = "IPAD_STATION_ACTIVE";
        else if (ua.match(/Android/i)) model = "ANDROID_OS_DETECTED";
        
        const sig = document.getElementById('sigModel');
        if (sig) sig.textContent = `[HARDWARE: ${model}]`;
    },

    initPulseTicker() {
        const ticker = document.getElementById('pulseTicker');
        if (!ticker) return;

        const regions = ['NA', 'EU', 'AS', 'SA', 'AF'];
        const creators = ['G101', 'XP_USER', 'ELITE_PRO', 'GHOST', 'RAZOR'];
        
        const generateItem = () => {
            const r = regions[Math.floor(Math.random() * regions.length)];
            const c = creators[Math.floor(Math.random() * creators.length)];
            const code = Math.floor(Math.random() * 900000 + 100000);
            return `<span class="ticker-item"><b>[${r}]</b> CREATOR_${c} generated Elite Code: <b>${code}</b> ...</span>`;
        };

        let content = "";
        for (let i = 0; i < 15; i++) content += generateItem();
        ticker.innerHTML = content + content; // Duplicate for seamless loop
    },

    initRecoilPreview() {
        const standard = document.getElementById('standardSpread');
        const xp = document.getElementById('xpSpread');
        if (!standard || !xp) return;

        const createDots = (container, scatter) => {
            for (let i = 0; i < 20; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                const x = 20 + (Math.random() - 0.5) * scatter;
                const y = 20 + (Math.random() - 0.5) * scatter;
                dot.style.left = `${x}px`;
                dot.style.top = `${y}px`;
                container.appendChild(dot);
            }
        };

        createDots(standard, 30);
        createDots(xp, 8);
    },

    setupPWAInstall() {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Show custom install UI if user is on the main dashboard
            console.log('PWA Install Ready');
        });
        // Global Sound Trigger
        document.addEventListener('click', (e) => {
            if (e.target.closest('button')) {
                if (window.NEURAL_AUDIO) window.NEURAL_AUDIO.play('ping');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => XP_ENHANCE.init());
