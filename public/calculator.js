/**
 * SHARED CALCULATOR LOGIC (V6 - FREE FIRE)
 */
const Calculator = {
    compute(ctx) {
        const tier = this.getTier(ctx.brand, ctx.series, ctx.model);
        
        let ram = ctx.ram || 8;
        if (ctx.brand === 'Apple') {
            if (ctx.model.includes('16') || ctx.model.includes('15 Pro')) ram = 8;
            else if (ctx.model.includes('15') || ctx.model.includes('14 Pro')) ram = 6;
            else ram = 4;
        }

        let base = 92;
        if (ram <= 6) base = 98;
        if (ram >= 12) base = 89;

        const factors = {
            speed: { 'slow': 0.94, 'medium': 1.0, 'fast': 1.07 }[ctx.speed] || 1.0,
            claw: { '2': 1.0, '3': 0.97, '4': 0.94 }[ctx.claw] || 1.0,
            grip: { 'palm': 1.0, 'claw': 1.04, 'tip': 1.07 }[ctx.grip] || 1.0
        };

        // Biometric Neural Adjuster (Hand Size)
        // Average hand size ~18.5cm. Larger hands need slightly lower sensitivity for control.
        const handFactor = 1 + (18.5 - (ctx.handSize || 18.5)) * 0.015;

        let adj = base * factors.speed * factors.claw * factors.grip * handFactor;
        
        if (tier === 'gaming') adj *= 0.96;
        if (tier === 'budget') adj *= 1.08;

        const gen = Math.round(adj);

        return {
            general: gen,
            redDot: Math.round(gen * 0.94),
            scope2x: Math.round(gen * 0.86),
            scope4x: Math.round(gen * 0.76),
            sniperScope: Math.round(gen * 0.42),
            freeLook: Math.round(gen * 1.25),
            
            ads: Math.max(gen, Math.round(gen * 1.05)),
            clawStyle: `${ctx.claw}-Finger`,
            gripStyle: (ctx.grip || 'palm').toUpperCase(),
            handFactor: (handFactor.toFixed(2)),
            dpi: this.getDPI(tier, gen),
            
            graphics: this.getGraphics(tier),
            fireButton: this.getFireButton(tier, ctx.speed),
            tip: this.getTip(tier, ctx),
            analysisPrefix: this.getAnalysisPrefix(tier),
            verdict: this.getVerdict(tier, ctx)
        };
    },

    getDPI(tier, gen) {
        let dpi = 411;
        if (tier === 'gaming') dpi = 580;
        if (tier === 'flagship') dpi = 480;
        if (gen > 95) dpi += 20;
        return dpi;
    },

    getTier(b, s, m) {
        const safe = str => (str || '').toLowerCase();
        const brand = safe(b);
        const series = safe(s);
        const model = safe(m);
        if (brand.includes('rog') || brand.includes('redmagic') || series.includes('gaming') || series.includes('pova') || series.includes('gt')) return 'gaming';
        if (brand.includes('apple') || brand.includes('iphone')) {
            if (model.includes('pro') || model.includes('max')) return 'flagship';
            return 'standard';
        }
        if (series.includes('s24') || series.includes('s23') || series.includes('phantom') || series.includes('zero') || brand.includes('find x') || brand.includes('x100')) return 'flagship';
        if (series.includes('spark') || series.includes('hot') || brand.includes('itel') || series.includes('narzo')) return 'budget';
        return 'standard';
    },

    getGraphics(tier) {
        if (tier === 'gaming' || tier === 'flagship') return 'ULTRA / MAX FPS';
        if (tier === 'standard') return 'STANDARD / HIGH FPS';
        return 'SMOOTH / HIGH FPS';
    },

    getFireButton(tier, speed) {
        let size = 65;
        if (tier === 'gaming') size = 58;
        if (tier === 'budget') size = 72;
        if (speed === 'fast') size -= 4;
        return size;
    },

    getTip(tier, ctx) {
        if (tier === 'gaming') return "HARDWARE OPTIMIZED: High refresh rate detected. Use 120Hz polling for stable response.";
        if (tier === 'budget') return "RESOURCES OPTIMIZED: Memory management active. Close background apps for best stability.";
        return "CALIBRATION COMPLETE: Optimized for precision tracking at head-level.";
    },

    getAnalysisPrefix(tier) {
        if (tier === 'gaming') return "ELITE GAMING ENGINE DETECTED";
        if (tier === 'flagship') return "HIGH-PERFORMANCE CORE ACTIVATED";
        return "OPTIMIZED SENSITIVITY CALIBRATED";
    },

    getVerdict(tier, ctx) {
        return "PERFECT SYNC";
    }
};
