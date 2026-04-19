/* ╔══════════════════════════════════════════════════════════╗
   ║   AXP NEXUS GAMING — EFFECTS ENGINE                      ║
   ║   Particle systems, interactive effects, utilities       ║
   ╚══════════════════════════════════════════════════════════╝ */

const GamingEffects = {
  // Particle System
  createParticles: (element, count = 20, color = 'cyan') => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const colorMap = {
      cyan: 'rgba(0, 242, 254, ',
      violet: 'rgba(168, 85, 247, ',
      gold: 'rgba(245, 158, 11, ',
    };

    const baseColor = colorMap[color] || colorMap.cyan;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 4 + 2;
      const angle = (Math.PI * 2 * i) / count;
      const velocity = Math.random() * 3 + 2;
      const tx = Math.cos(angle) * 100;
      const ty = Math.sin(angle) * 100;

      particle.style.position = 'absolute';
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.borderRadius = '50%';
      particle.style.background = baseColor + '0.8)';
      particle.style.boxShadow = `0 0 ${size * 2}px ${baseColor}0.6)`;
      particle.style.animation = `burst ${2 + Math.random()}s ease-out forwards`;
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      const rect = element.getBoundingClientRect();
      particle.style.left = rect.left + rect.width / 2 + 'px';
      particle.style.top = rect.top + rect.height / 2 + 'px';

      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 3000);
  },

  // Neon Glow Effect on Element
  addNeonGlow: (element, color = 'cyan', intensity = 'medium') => {
    const glowMap = {
      cyan: {
        subtle: 'box-shadow: 0 0 10px rgba(0, 242, 254, 0.2), inset 0 0 10px rgba(0, 242, 254, 0.05);',
        medium: 'box-shadow: 0 0 20px rgba(0, 242, 254, 0.4), inset 0 0 15px rgba(0, 242, 254, 0.1);',
        intense: 'box-shadow: 0 0 40px rgba(0, 242, 254, 0.6), inset 0 0 20px rgba(0, 242, 254, 0.2);',
      },
      violet: {
        subtle: 'box-shadow: 0 0 10px rgba(168, 85, 247, 0.2), inset 0 0 10px rgba(168, 85, 247, 0.05);',
        medium: 'box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(168, 85, 247, 0.1);',
        intense: 'box-shadow: 0 0 40px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.2);',
      },
      gold: {
        subtle: 'box-shadow: 0 0 10px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.05);',
        medium: 'box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), inset 0 0 15px rgba(245, 158, 11, 0.1);',
        intense: 'box-shadow: 0 0 40px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.2);',
      },
    };

    const glow = glowMap[color]?.[intensity] || glowMap.cyan.medium;
    element.style.cssText += glow;
  },

  // Screen Glitch Effect
  screenGlitch: (duration = 200) => {
    const glitchDiv = document.createElement('div');
    glitchDiv.style.position = 'fixed';
    glitchDiv.style.top = '0';
    glitchDiv.style.left = '0';
    glitchDiv.style.width = '100%';
    glitchDiv.style.height = '100%';
    glitchDiv.style.pointerEvents = 'none';
    glitchDiv.style.zIndex = '10000';
    glitchDiv.style.background = 'repeating-linear-gradient(90deg, rgba(0,242,254,0.03) 0px, rgba(0,242,254,0.05) 2px, transparent 4px)';
    glitchDiv.style.animation = `glitch-screen ${duration}ms ease-in-out`;

    document.body.appendChild(glitchDiv);
    setTimeout(() => glitchDiv.remove(), duration);
  },

  // Scan Lines Overlay
  addScanLines: (container) => {
    const scanlines = document.createElement('div');
    scanlines.style.position = 'absolute';
    scanlines.style.top = '0';
    scanlines.style.left = '0';
    scanlines.style.width = '100%';
    scanlines.style.height = '100%';
    scanlines.style.pointerEvents = 'none';
    scanlines.style.background = 'repeating-linear-gradient(0deg, rgba(0, 242, 254, 0.03) 0px, rgba(0, 242, 254, 0.03) 2px, transparent 4px)';
    scanlines.style.opacity = '0.5';
    scanlines.className = 'animate-scan-line';

    container.style.position = 'relative';
    container.appendChild(scanlines);
  },

  // Text Reveal Animation
  revealText: (element, delayPerChar = 30) => {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';

    let index = 0;
    const reveal = () => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        setTimeout(reveal, delayPerChar);
      }
    };
    reveal();
  },

  // Matrix Rain Background
  createMatrixRain: (container, characters = '01アイウエオカキクケコサシスセソタチツテト', speed = 'medium') => {
    const speedMap = {
      slow: 8000,
      medium: 5000,
      fast: 2000,
    };

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.opacity = '0.05';
    canvas.style.pointerEvents = 'none';

    container.style.position = 'relative';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const fontSize = 20;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(0);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        drops[i]++;

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }

      requestAnimationFrame(draw);
    };

    draw();
  },

  // Typewriter Effect
  typewriter: (element, text, speed = 50, callback = null) => {
    element.textContent = '';
    let index = 0;

    const type = () => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    };
    type();
  },

  // Loading Bar Animation
  showLoadingBar: (duration = 2000, callback = null) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '3px';
    container.style.zIndex = '9999';
    container.style.background = 'linear-gradient(90deg, transparent, #00f2fe, transparent)';

    const bar = document.createElement('div');
    bar.style.width = '0%';
    bar.style.height = '100%';
    bar.style.background = 'linear-gradient(90deg, #00f2fe, #a855f7)';
    bar.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.6)';
    bar.style.animation = `decryption-load ${duration}ms ease-out forwards`;

    container.appendChild(bar);
    document.body.appendChild(container);

    setTimeout(() => {
      container.remove();
      if (callback) callback();
    }, duration);
  },

  // Pulse Animation on Click
  pulseOnClick: (element, color = 'cyan') => {
    element.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.pointerEvents = 'none';
      ripple.style.opacity = '0.6';

      const colorMap = {
        cyan: 'rgba(0, 242, 254, 0.5)',
        violet: 'rgba(168, 85, 247, 0.5)',
        gold: 'rgba(245, 158, 11, 0.5)',
      };

      ripple.style.background = colorMap[color] || colorMap.cyan;
      ripple.style.animation = 'ripple-out 0.6s ease-out';

      if (!this.style.position || this.style.position === 'static') {
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
      }

      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  },

  // Success Animation
  showSuccess: (message = 'Success!', duration = 2000) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '16px 24px';
    toast.style.background = 'rgba(34, 197, 94, 0.9)';
    toast.style.color = '#fff';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';
    toast.style.zIndex = '9999';
    toast.style.animation = 'slide-in-right 0.4s ease-out';

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slide-in-right 0.4s ease-out reverse';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // Error Animation
  showError: (message = 'Error!', duration = 2000) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '16px 24px';
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
    toast.style.color = '#fff';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.3)';
    toast.style.zIndex = '9999';
    toast.style.animation = 'slide-in-right 0.4s ease-out';

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slide-in-right 0.4s ease-out reverse';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // Decryption Counter Animation
  countUp: (element, start, end, duration = 1000, suffix = '') => {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const counter = setInterval(() => {
      current += increment;
      element.textContent = current + suffix;

      if ((increment === 1 && current >= end) || (increment === -1 && current <= end)) {
        element.textContent = end + suffix;
        clearInterval(counter);
      }
    }, stepTime);
  },

  // Gradient Text Animation
  animateGradient: (element) => {
    const colors = ['#00f2fe', '#a855f7', '#f59e0b', '#00f2fe'];
    let colorIndex = 0;

    setInterval(() => {
      const currentColor = colors[colorIndex];
      const nextColor = colors[(colorIndex + 1) % colors.length];

      element.style.background = `linear-gradient(90deg, ${currentColor}, ${nextColor})`;
      element.style.WebkitBackgroundClip = 'text';
      element.style.WebkitTextFillColor = 'transparent';

      colorIndex = (colorIndex + 1) % colors.length;
    }, 2000);
  },

  // Scale Up Animation
  scaleUp: (element, targetScale = 1.2, duration = 500) => {
    element.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    element.style.transform = `scale(${targetScale})`;
  },

  // Reset Scale
  resetScale: (element, duration = 500) => {
    element.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    element.style.transform = 'scale(1)';
  },
};

// Add ripple animation keyframe
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-out {
    0% {
      transform: scale(0);
      opacity: 0.6;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes glitch-screen {
    0%, 100% {
      transform: translateX(0);
    }
    10% {
      transform: translateX(2px);
    }
    20% {
      transform: translateX(-2px);
    }
    30% {
      transform: translateX(2px);
    }
    40% {
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamingEffects;
}
