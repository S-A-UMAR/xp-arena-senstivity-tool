/**
 * AXP | ELITE ENHANCEMENTS ENGINE
 * High-performance 3D & Interactive Logic
 */

class EliteEnhancements {
    constructor() {
        this.canvas = document.getElementById('neural-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.initParticles();
            this.animateParticles();
        }
        this.initTilt();
        this.initGlitchTrigger();
    }

    initParticles() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.particles = [];
        const count = Math.min(window.innerWidth / 12, 120);
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                size: Math.random() * 2 + 0.5,
                color: i % 3 === 0 ? '#00f0ff' : i % 3 === 1 ? '#b300ff' : '#00ff88',
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }

    animateParticles() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 🕸️ Draw Neural Connections
        this.ctx.lineWidth = 0.4;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 180) {
                    const opacity = (1 - dist / 180) * 0.2;
                    this.ctx.strokeStyle = `rgba(179, 0, 255, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // 💠 Draw Nodes
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > this.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.height) p.vy *= -1;
        });
        
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animateParticles());
    }

    initTilt() {
        // Universal 3D Tilt Logic
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.premium-card, .glass-card');
            const x = (window.innerWidth / 2 - e.pageX) / 25;
            const y = (window.innerHeight / 2 - e.pageY) / 25;
            
            cards.forEach(card => {
                card.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
            });
            
            // Background Parallax
            const bgGlow = document.querySelector('.premium-shell::before');
            if (bgGlow) {
                bgGlow.style.transform = `translate(${x * 2}px, ${y * 2}px)`;
            }
        });
    }

    initGlitchTrigger() {
        const headers = document.querySelectorAll('.hero-headline, h1');
        headers.forEach(h => {
            h.addEventListener('mouseover', () => {
                h.classList.add('glitch-active');
                setTimeout(() => h.classList.remove('glitch-active'), 500);
            });
        });
    }
}

// 🔋 Ignite Engine
window.addEventListener('DOMContentLoaded', () => {
    window.Elite = new EliteEnhancements();
});

window.addEventListener('resize', () => {
    if (window.Elite) window.Elite.initParticles();
});
