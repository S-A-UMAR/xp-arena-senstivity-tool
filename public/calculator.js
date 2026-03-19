window.Calculator = {
    getTier(brand, series, model) {
        if (!model) return 'mid';
        const m = model.toLowerCase();
        if (m.includes('ultra') || m.includes('pro max') || m.includes('rog') || m.includes('gt') || m.includes('redmagic')) return 'high';
        if (m.includes('pro') || m.includes('plus') || m.includes('note') || m.includes('s2') || m.includes('iphone 1')) return 'mid';
        return 'budget';
    },

    compute(state) {
        const tier = this.getTier(state.brand, state.series, state.model);
        const scale = state.neuralScale || 5.0;
        
        // Base values for Tier (FF Max now supports up to 200)
        let baseRel = tier === 'high' ? 175 : tier === 'mid' ? 160 : 145;
        
        // AI Factor adjustment (scale 1-10, 5 is neutral)
        const aiFactor = (scale - 5) * 5; 
        baseRel += aiFactor;

        // RAM Factor (Higher RAM = Lower required sensitivity for stability)
        const ram = state.ram || 8;
        const ramFactor = (8 - ram) * 1.5;
        baseRel += ramFactor;

        const createRange = (val, variation = 3) => {
            const v = Math.round(val);
            const low = Math.max(0, v - 3);
            const high = Math.min(200, v + 3);
            return `${low}-${high}`;
        };

        // Final result JSON
        const results = {
            general: createRange(baseRel),
            redDot: createRange(baseRel * 0.95),
            scope2x: createRange(baseRel * 0.90),
            scope4x: createRange(baseRel * 0.88),
            sniperScope: createRange(baseRel * 0.6),
            freeLook: createRange(baseRel * 1.1),
            ads: createRange(baseRel * 1.02),
            dpi: tier === 'high' ? "800-840" : tier === 'mid' ? "440-480" : "411-440",
            fireButton: state.brand === 'Apple' ? "54-58" : "62-66",
            graphics: tier === 'high' ? 'Ultra / Max' : 'Smooth / High',
            clawStyle: (state.grip || '2') === 'claw' ? '4-Finger' : '2-Finger',
            gripStyle: (state.grip || '2').toUpperCase()
        };

        // Manual Override Injection
        if (state.manualSens && !isNaN(parseFloat(state.manualSens))) {
            const manualVal = parseFloat(state.manualSens);
            results.general = createRange(manualVal);
            results.isManual = true;
        }

        return results;
    }
};
