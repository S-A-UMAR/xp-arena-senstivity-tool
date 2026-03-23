(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ResultUtils = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function clamp(num, min, max) {
        return Math.max(min, Math.min(max, num));
    }

    function parseRange(v) {
        if (typeof v === 'number' && Number.isFinite(v)) return [Math.max(0, v - 3), Math.min(200, v + 3)];
        if (typeof v === 'string') {
            const m = v.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
            if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
            const n = Number.parseFloat(v);
            if (Number.isFinite(n)) return [Math.max(0, Math.round(n - 3)), Math.min(200, Math.round(n + 3))];
        }
        return ['--', '--'];
    }

    function inferEfficiency(results) {
        const keys = ['general', 'redDot', 'scope2x', 'scope4x', 'ads', 'sniperScope'];
        const scores = keys.map((key) => {
            const raw = results[key] || results[key === 'sniperScope' ? 'sniper' : key];
            const parsed = parseRange(raw);
            if (!Array.isArray(parsed) || parsed[0] === '--') return 88;
            const midpoint = (parsed[0] + parsed[1]) / 2;
            const spread = Math.abs(parsed[1] - parsed[0]);
            return clamp(100 - Math.abs(170 - midpoint) * 0.12 - spread * 0.9, 82, 99);
        });
        return scores.length ? scores.reduce((sum, item) => sum + item, 0) / scores.length : 94;
    }

    function buildShareText(details) {
        return [
            'XP ARENA ACCESS PROFILE',
            `DEVICE: ${details.modelText || 'UNKNOWN'}`,
            `GENERAL: ${details.general || '--'}`,
            `RED DOT: ${details.redDot || '--'}`,
            `DPI: ${details.dpi || 'DEFAULT'}`,
            `EFFICIENCY: ${details.efficiency || 0}%`,
            details.shareUrl ? `SHARE: ${details.shareUrl}` : null,
            details.code ? `CODE: ${details.code}` : null
        ].filter(Boolean).join('\n');
    }

    return {
        clamp,
        parseRange,
        inferEfficiency,
        buildShareText
    };
});
