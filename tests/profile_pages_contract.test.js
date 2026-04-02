const fs = require('fs');
const path = require('path');

describe('profile page contracts', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  it('keeps user index verification flow widgets present', () => {
    const html = read('public/index.html');
    expect(html).toContain('id="vaultInput"');
    expect(html).toContain('id="vaultAuthBtn"');
    expect(html).toContain('id="scannerOverlay"');
  });

  it('keeps result page focused on card actions without feedback panel', () => {
    const html = read('public/result.html');
    expect(html).toContain('id="downloadBtn"');
    expect(html).toContain('id="copyBtn"');
    expect(html).not.toContain('id="feedbackPanel"');
    expect(html).not.toContain('id="likeBtn"');
  });

  it('keeps vendor and admin core containers present', () => {
    const vendorHtml = read('public/vendor_dashboard.html');
    const adminHtml = read('public/admin.html');
    expect(vendorHtml).toContain('id="section-home"');
    expect(vendorHtml).toContain('id="genResult"');
    expect(adminHtml).toContain('id="mainPanel"');
    expect(adminHtml).toContain('id="section-vendors"');
  });

  it('keeps root vendor_dashboard page aligned with public vendor dashboard', () => {
    const rootVendor = read('vendor_dashboard.html');
    const publicVendor = read('public/vendor_dashboard.html');
    expect(rootVendor).toBe(publicVendor);
  });
});
