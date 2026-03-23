const { parseRange, inferEfficiency, buildShareText } = require('../public/result-utils');

describe('result utils', () => {
  it('parses numeric ranges from strings and raw numbers', () => {
    expect(parseRange('100-120')).toEqual([100, 120]);
    expect(parseRange(96)).toEqual([93, 99]);
  });

  it('infers efficiency from populated results', () => {
    const value = inferEfficiency({
      general: '160-170',
      redDot: '165-175',
      scope2x: '150-160',
      scope4x: '145-155',
      ads: '155-165',
      sniperScope: '140-150'
    });
    expect(value).toBeGreaterThan(82);
    expect(value).toBeLessThanOrEqual(99);
  });

  it('builds share text including signed share links when provided', () => {
    const text = buildShareText({
      modelText: 'APPLE IPHONE 17 PLUS',
      general: '160 — 170',
      redDot: '165 — 175',
      dpi: '600-640',
      efficiency: 94,
      shareUrl: 'https://example.com/result.html?share=abc',
      code: ''
    });
    expect(text).toContain('SHARE: https://example.com/result.html?share=abc');
    expect(text).not.toContain('CODE:');
  });
});
