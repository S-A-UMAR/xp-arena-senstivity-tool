#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function fail(errors, message) {
  errors.push(message);
}

function checkDuplicateFunctionDeclarations(filePath, errors) {
  const source = read(filePath);
  const names = [...source.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
  const seen = new Set();
  const dupes = new Set();
  names.forEach((name) => {
    if (seen.has(name)) dupes.add(name);
    seen.add(name);
  });
  if (dupes.size > 0) {
    fail(errors, `${filePath}: duplicate function declarations -> ${[...dupes].join(', ')}`);
  }
}

function checkUniqueToken(text, token, label, errors) {
  const count = (text.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 1) {
    fail(errors, `${label}: duplicated token found (${count}x): ${token}`);
  }
}

function checkResultTemplateContracts(errors) {
  const source = read('public/result.html');
  if (source.includes('cdnjs.cloudflare.com/ajax/libs/html2canvas')) {
    fail(errors, 'public/result.html: must not depend on html2canvas CDN.');
  }
  if (!source.includes('data-i18n="deviceAccess"')) {
    fail(errors, 'public/result.html: missing data-i18n="deviceAccess" marker.');
  }
}

function main() {
  const errors = [];

  checkDuplicateFunctionDeclarations('routes/vaultRoutes.js', errors);

  const settings = read('public/settings.js');
  checkUniqueToken(settings, 'const selectorTranslationMap = {', 'public/settings.js', errors);
  checkUniqueToken(settings, 'function applyDomTranslations(langCode)', 'public/settings.js', errors);
  checkUniqueToken(settings, 'function closeActivePanels()', 'public/settings.js', errors);

  const translations = read('public/translations.js');
  checkUniqueToken(translations, 'const UNIVERSAL_UI_EXTRAS = {', 'public/translations.js', errors);

  checkResultTemplateContracts(errors);

  if (errors.length > 0) {
    console.error('QUALITY_GUARD_FAILED');
    errors.forEach((line) => console.error(` - ${line}`));
    process.exit(1);
  }

  console.log('QUALITY_GUARD_OK');
}

main();
