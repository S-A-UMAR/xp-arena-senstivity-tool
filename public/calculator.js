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
        
        // Base values for Tier
        let baseRel = tier === 'high' ? 98 : tier === 'mid' ? 94 : 90;
        
        // AI Factor adjustment (scale 1-10, 5 is neutral)
        const aiFactor = (scale - 5) * 1.5;
        baseRel += aiFactor;

        // Final result JSON
        const results = {
            general: Math.min(100, Math.round(baseRel)),
            redDot: Math.min(100, Math.round(baseRel * 0.95)),
            scope2x: Math.min(100, Math.round(baseRel * 0.90)),
            scope4x: Math.min(100, Math.round(baseRel * 0.88)),
            sniperScope: Math.round(baseRel * 0.6),
            freeLook: Math.round(baseRel * 1.1),
            ads: Math.min(100, Math.round(baseRel * 1.02)),
            dpi: tier === 'high' ? 800 : tier === 'mid' ? 440 : 411,
            fireButton: state.brand === 'Apple' ? 58 : 65,
            graphics: tier === 'high' ? 'Ultra / Max' : 'Smooth / High',
            clawStyle: state.grip === 'claw' ? '4-Finger' : '2-Finger',
            gripStyle: state.grip.toUpperCase()
        };

        // Manual Override Injection
        if (state.manualSens && !isNaN(parseFloat(state.manualSens))) {
            const manualVal = Math.round(parseFloat(state.manualSens));
            results.general = manualVal;
            results.isManual = true;
        }

        return results;
    }
};
