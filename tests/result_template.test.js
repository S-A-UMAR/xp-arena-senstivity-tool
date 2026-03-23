const fs = require('fs');
const path = require('path');

describe('result template contract', () => {
  const resultHtml = fs.readFileSync(path.join(__dirname, '../public/result.html'), 'utf8');

  it('does not depend on the html2canvas CDN for result card export', () => {
    expect(resultHtml).not.toContain('cdnjs.cloudflare.com/ajax/libs/html2canvas');
  });

  it('marks key result labels for translation', () => {
    expect(resultHtml).toContain('data-i18n="resultHeroText"');
    expect(resultHtml).toContain('data-i18n="verificationLabel"');
    expect(resultHtml).toContain('data-i18n="deviceAccess"');
    expect(resultHtml).toContain('data-i18n="followCreator"');
  });
});
