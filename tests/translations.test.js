describe('translations coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = {};
  });

  it('exposes universal UI keys for every supported language', () => {
    require('../public/translations.js');
    const languages = global.window.LANGUAGES;
    ['en', 'es', 'pt', 'bn', 'id', 'th', 'vi', 'hi', 'ar', 'tr', 'ru'].forEach((lang) => {
      expect(languages[lang]).toBeDefined();
      expect(languages[lang].profileFeedback).toBeTruthy();
      expect(languages[lang].generateCode).toBeTruthy();
      expect(languages[lang].secureShareLink).toBeTruthy();
      expect(languages[lang].homeNav).toBeTruthy();
    });
  });
});
