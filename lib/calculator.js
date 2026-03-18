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
        
        // Base values for Tier (General Sensitivity)
        let baseRel = tier === 'high' ? 98 : tier === 'mid' ? 94 : 90;
        
        // ⚡ Apply Global Offset (Master Control)
        baseRel *= parseFloat(globalOffset);
        
        // AI Factor adjustment (scale 1-10, 5 is neutral)
        const aiFactor = (state.speed === 'fast' ? 5 : state.speed === 'slow' ? -5 : 0) + (scale - 5) * 1.5;
        baseRel += aiFactor;

        // Implementation of ranges (±4 variance for a premium "Mastering" feel)
        const range = (val, max = 200) => {
            const v = Math.round(val);
            const low = Math.max(0, v - Math.floor(Math.random() * 2) - 3);
            const high = Math.min(max, v + Math.floor(Math.random() * 2) + 4);
            return `${low}-${high}`;
        };

        // Final result JSON
        const results = {
            formula_version: this.version,
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
            const manualVal = parseFloat(state.manualSens);
            results.general = range(manualVal, 200);
            results.isManual = true;
        }

        return results;
    }
};

module.exports = Calculator;
