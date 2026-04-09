const Calculator = {
    version: '2.0.0-PRO-FF',

    getTier(brand, series, model, ram) {
        let t = 'mid';
        const m = (model || '').toLowerCase();
        const b = (brand || '').toLowerCase();
        
        if (m.includes('ultra') || m.includes('pro max') || m.includes('rog') || m.includes('redmagic') || b === 'apple' || ram >= 12) {
            t = 'high';
        } else if (m.includes('pro') || m.includes('plus') || m.includes('note') || ram >= 6) {
            t = 'mid';
        } else if (ram <= 4) {
            t = 'budget';
        }
        return t;
    },

    compute(state, globalOffset = 1.0) {
        const brand = (state.brand || 'Unknown').toLowerCase();
        const series = state.series || '';
        const model = state.model || 'Unknown';
        const ram = parseInt(state.ram, 10) || 6;
        const playstyle = (state.speed || 'balanced').toLowerCase(); // slow, balanced, fast
        const clawStr = String(state.claw || '2'); // 2, 3, 4
        const claw = parseInt(clawStr.replace(/[^0-9]/g, '')) || 2;
        
        const tier = this.getTier(brand, series, model, ram);
        const scale = parseFloat(state.neuralScale) || 5.0; // 1-10

        // 1. FREE FIRE CORE SENSITIVITY CALCULATION (Scale 0-100+)
        // Budget tier needs higher sensitivity to compensate for screen delay. High tier needs less.
        let baseGeneral = tier === 'budget' ? 95 : (tier === 'mid' ? 88 : 82);

        // Adjust based on RAM directly
        if (ram <= 4) baseGeneral += 5;
        if (ram >= 12) baseGeneral -= 5;

        // Playstyle adjustment
        if (playstyle === 'fast') baseGeneral += 8;
        if (playstyle === 'slow') baseGeneral -= 10;

        // Neural AI Offset
        baseGeneral += (scale - 5) * 1.5;

        // Global Offset
        baseGeneral *= parseFloat(globalOffset);

        // Clamping system
        const clamp = (val, min = 10, max = 100) => {
            const v = Math.round(val);
            if (v > max) return max;
            if (v < min) return min;
            return v;
        };

        const range = (val, spread = 2, absoluteMax = 100) => {
            const v = Math.round(val);
            const low = Math.max(10, v - spread);
            const high = Math.min(absoluteMax, v + spread);
            if (low === high) return `${low}`;
            return `${low} - ${high}`;
        };

        // Scopes
        // Red dot needs to be slightly higher or perfectly matched for drag headshots
        const redDot = clamp(baseGeneral * 0.98);
        const scope2x = clamp(baseGeneral * 0.92);
        const scope4x = clamp(baseGeneral * 0.88);
        const sniper = clamp(baseGeneral * 0.50); // Snipe needs precision
        const freeLook = clamp(baseGeneral * 0.80);

        // 2. PRECISE DPI LOGIC
        // Free Fire DPI rules:
        let dpiOut = "411 (Default)";
        if (brand.includes('apple') || brand.includes('ios') || brand.includes('iphone')) {
            dpiOut = "Standard (120 Gliding)";
        } else {
            let baseDpi = 411;
            if (tier === 'budget' || ram <= 4) baseDpi = 580;
            else if (brand.includes('sams')) baseDpi = 500;
            else if (brand.includes('xiao') || brand.includes('poco')) baseDpi = 460;
            else if (tier === 'high') baseDpi = 440; // High tier doesn't need huge DPI, panels are fast

            if (playstyle === 'fast') baseDpi += 40;
            if (playstyle === 'slow') baseDpi -= 20;
            
            // Round to nearest 10 for clean output
            baseDpi = Math.round(baseDpi / 10) * 10;
            dpiOut = `${baseDpi} - ${baseDpi + 20}`;
        }

        // 3. FIRE BUTTON CALCULATION
        let btnBase = 50; 
        if (claw === 4 || claw >= 4) btnBase = 42; // Aggressive claw
        else if (claw === 3) btnBase = 48; // Standard claw
        else btnBase = 58; // Thumb players

        if (playstyle === 'fast') btnBase -= 3; // Fast players prefer smaller buttons for quicker taps
        if (tier === 'budget') btnBase += 4; // Small screens

        btnBase = clamp(btnBase, 35, 80);
        const buttonOut = `${btnBase} - ${btnBase + 3}%`;

        // 4. ASSEMBLING THE JSON RESULTS
        const results = {
            formula_version: this.version,
            global_offset_applied: Number(parseFloat(globalOffset).toFixed(2)),
            brand: state.brand,
            model: state.model || 'Unknown Device',
            
            general: range(baseGeneral, 2, 100),
            redDot: range(redDot, 3, 100),
            scope2x: range(scope2x, 2, 100),
            scope4x: range(scope4x, 2, 100),
            sniperScope: range(sniper, 4, 100),
            freeLook: range(freeLook, 5, 100),
            
            dpi: dpiOut,
            fireButton: buttonOut,
            
            graphics: tier === 'high' ? 'Ultra / High Res' : (tier === 'mid' ? 'Standard / High FPS' : 'Smooth / High FPS'),
            gripStyle: `${claw}-Finger Claw`,
            playstyle: playstyle.charAt(0).toUpperCase() + playstyle.slice(1)
        };

        // Manual Override Injection Support
        if (state.manualSens && !isNaN(parseFloat(state.manualSens))) {
            const manualVal = clamp(parseFloat(state.manualSens) * parseFloat(globalOffset));
            results.general = range(manualVal, 2);
            results.redDot = range(manualVal * 0.98, 3);
            results.scope2x = range(manualVal * 0.92, 2);
            results.scope4x = range(manualVal * 0.88, 2);
            results.sniperScope = range(manualVal * 0.50, 4);
            results.freeLook = range(manualVal * 0.80, 5);
            results.isManual = true;
        }

        return results;
    }
};

module.exports = Calculator;
