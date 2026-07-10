const { chromium } = require('playwright');
const config = require('../config/app-config');
const logger = require('../utils/logger');

async function createBrowser() {
  logger.info('Запускаю браузер Chromium');

  const browser = await chromium.launch({
    headless: config.browser.headless,
  });

  return browser;
}

async function createPage(browser) {
  const page = await browser.newPage({
    viewport: config.browser.viewport,
  });

  page.setDefaultTimeout(config.browser.timeout);

  return page;
}

module.exports = {
  createBrowser,
  createPage,
};
