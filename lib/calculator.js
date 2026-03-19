const Calculator = {
    version: '1.0.0-PRO',
    getTier(brand, series, model) {
        if (!model) return 'mid';
        const m = model.toLowerCase();
        if (m.includes('ultra') || m.includes('pro max') || m.includes('rog') || m.includes('gt') || m.includes('redmagic')) return 'high';
        if (m.includes('pro') || m.includes('plus') || m.includes('note') || m.includes('s2') || m.includes('iphone 1')) return 'mid';
        return 'budget';
    },

    compute(state, globalOffset = 1.0) {
        const tier = this.getTier(state.brand, state.series, state.model);
        const scale = state.neuralScale || 5.0;
        
        // Base values for Tier (General Sensitivity) - Updated for Free Fire Max (200 Limit)
        let baseRel = tier === 'high' ? 175 : tier === 'mid' ? 160 : 145;
        
        // ⚡ Apply Global Offset (Master Control)
        baseRel *= parseFloat(globalOffset);
        
        // RAM Factor (Higher RAM = Lower required sensitivity for stability)
        const ram = state.ram || 8;
        const ramFactor = (8 - ram) * 1.5;
        baseRel += ramFactor;
        
        // ⚔️ Combat Playstyle Intelligence (Slow / Balanced / Fast)
        const speedMap = { slow: -15, balanced: 0, fast: 15 };
        const playstyleFactor = speedMap[state.speed] || 0;
        baseRel += playstyleFactor;

        // AI Factor adjustment (scale 1-10, 5 is neutral)
        const aiFactor = (scale - 5) * 5;
        baseRel += aiFactor;

        // Implementation of ranges (±3 variance for a premium "Mastering" feel)
        const range = (val, max = 200) => {
            const v = Math.round(val);
            const low = Math.max(0, v - 3);
            const high = Math.min(max, v + 3);
            return `${low}-${high}`;
        };

        // Final result JSON
        const results = {
            formula_version: this.version,
            global_offset_applied: Number(parseFloat(globalOffset || 1).toFixed(2)),
            brand: state.brand,
            model: state.model,
            general: range(baseRel, 200),
            redDot: range(baseRel * 0.95, 200),
            scope2x: range(baseRel * 0.90, 200),
            scope4x: range(baseRel * 0.88, 200),
            sniperScope: range(baseRel * 0.6, 200),
            freeLook: range(baseRel * 1.1, 200),
            dpi: tier === 'high' ? "800-840" : tier === 'mid' ? "440-480" : "411-440",
            fireButton: state.brand === 'Apple' ? "54-58" : "62-66",
            graphics: tier === 'high' ? 'Ultra / Max' : 'Smooth / High',
            clawStyle: state.claw === '4' ? '4-Finger' : '2-Finger',
            gripStyle: (state.grip || 'palm').toUpperCase()
        };

        // Manual Override Injection
        if (state.manualSens && !isNaN(parseFloat(state.manualSens))) {
            const manualVal = parseFloat(state.manualSens) * parseFloat(globalOffset || 1);
            results.general = range(manualVal, 200);
            results.redDot = range(manualVal * 0.95, 200);
            results.scope2x = range(manualVal * 0.90, 200);
            results.scope4x = range(manualVal * 0.88, 200);
            results.sniperScope = range(manualVal * 0.6, 200);
            results.freeLook = range(manualVal * 1.1, 200);
            results.isManual = true;
        }

        return results;
    }
};

module.exports = Calculator;
