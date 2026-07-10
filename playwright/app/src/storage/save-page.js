const fs = require('fs');
const path = require('path');
const config = require('../config/app-config');
const logger = require('../utils/logger');

function safeNameFromUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function saveHtml(page, url) {
  ensureDir(config.paths.htmlDir);

  const fileName = `${safeNameFromUrl(url)}.html`;
  const filePath = path.join(config.paths.htmlDir, fileName);

  const html = await page.content();

  fs.writeFileSync(filePath, html, 'utf-8');

  logger.info(`HTML сохранён: ${filePath}`);

  return filePath;
}

async function saveScreenshot(page, url) {
  ensureDir(config.paths.screenshotsDir);

  const fileName = `${safeNameFromUrl(url)}.png`;
  const filePath = path.join(config.paths.screenshotsDir, fileName);

  await page.screenshot({
    path: filePath,
    fullPage: true,
  });

  logger.info(`Скриншот сохранён: ${filePath}`);

  return filePath;
}

module.exports = {
  saveHtml,
  saveScreenshot,
  safeNameFromUrl,
};
