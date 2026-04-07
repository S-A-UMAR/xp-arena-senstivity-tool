/**
 * AXP - NEURAL AUDIO ENGINE
 * Synthesizes high-end tactical audio using the Web Audio API.
 * No external assets required.
 */
const NEURAL_AUDIO = {
    ctx: null,
    masterGain: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
    },

    play(type) {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        switch (type) {
            case 'ping': this.playPing(); break;
            case 'pulse': this.playPulse(); break;
            case 'calculate': this.playCalculation(); break;
            case 'success': this.playSuccess(); break;
            case 'error': this.playError(); break;
        }
    },

    playPing() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playPulse() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    playCalculation() {
        // Futuristic scanning sound
        const duration = 0.5;
        const count = 3;
        for(let i=0; i<count; i++) {
            const time = this.ctx.currentTime + (i * 0.15);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(200 + (i * 400), time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.1);
        }
    },

    playSuccess() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (i * 0.08));
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + (i * 0.08));
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (i * 0.08) + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(this.ctx.currentTime + (i * 0.08));
            osc.stop(this.ctx.currentTime + (i * 0.08) + 0.4);
        });
    },

    playError() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
};

window.NEURAL_AUDIO = NEURAL_AUDIO;
