const fs = require('fs');
const path = require('path');

function safeNameFromUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function saveResult(result) {
  const dir = '/data/export/playwright-results';

  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${safeNameFromUrl(result.url)}_${Date.now()}.json`;
  const filePath = path.join(dir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

  return filePath;
}

module.exports = {
  saveResult,
};
