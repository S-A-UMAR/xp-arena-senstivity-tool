window.Calculator = {
    version: '1.0.0-PRO',

    getTier(brand, series, model) {
        if (!model) return 'mid';
        const m = model.toLowerCase();
        if (m.includes('ultra') || m.includes('pro max') || m.includes('rog') || m.includes('gt') || m.includes('redmagic')) return 'high';
        if (m.includes('pro') || m.includes('plus') || m.includes('note') || m.includes('s2') || m.includes('iphone 1')) return 'mid';
        return 'budget';
    },

    range(val, max = 200) {
        const v = Math.round(val);
        const low = Math.max(0, v - 3);
        const high = Math.min(max, v + 4);
        return `${low}-${high}`;
    },

    compute(state, globalOffset = 1.0) {
        const tier = this.getTier(state.brand, state.series, state.model);
        const scale = state.neuralScale || 5.0;

        let baseRel = tier === 'high' ? 98 : tier === 'mid' ? 94 : 90;
        baseRel *= parseFloat(globalOffset || 1.0);

        const aiFactor = (state.speed === 'fast' ? 5 : state.speed === 'slow' ? -5 : 0) + (scale - 5) * 1.5;
        baseRel += aiFactor;

        const results = {
            formula_version: this.version,
            brand: state.brand,
            model: state.model,
            general: this.range(baseRel, 200),
            redDot: this.range(baseRel * 0.95, 200),
            scope2x: this.range(baseRel * 0.9, 200),
            scope4x: this.range(baseRel * 0.88, 200),
            sniperScope: this.range(baseRel * 0.6, 200),
            freeLook: this.range(baseRel * 1.1, 200),
            dpi: tier === 'high' ? '800-840' : tier === 'mid' ? '440-480' : '411-440',
            fireButton: state.brand === 'Apple' ? '54-58' : '62-66',
            graphics: tier === 'high' ? 'Ultra / Max' : 'Smooth / High',
            clawStyle: state.claw === '4' ? '4-Finger' : '2-Finger',
            gripStyle: (state.grip || 'palm').toUpperCase()
        };

        if (state.manualSens && !isNaN(parseFloat(state.manualSens))) {
            const manualVal = parseFloat(state.manualSens);
            results.general = this.range(manualVal, 200);
            results.isManual = true;
        }

        return results;
    }
};
