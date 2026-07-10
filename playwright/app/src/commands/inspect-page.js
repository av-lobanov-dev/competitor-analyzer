const logger = require('../utils/logger');
const { saveHtml, saveScreenshot } = require('../storage/save-page');

async function inspectPage(page, url) {
  logger.info(`Открываю страницу: ${url}`);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const title = await page.title();

  const text = await page.locator('body').innerText().catch(() => '');

  const links = await page.$$eval('a[href]', (elements) => {
    return elements.map((element) => ({
      text: element.innerText.trim(),
      href: element.href,
    }));
  });

  const buttons = await page.$$eval('button', (elements) => {
    return elements.map((element) => ({
      text: element.innerText.trim(),
    }));
  });

  const htmlPath = await saveHtml(page, url);
  const screenshotPath = await saveScreenshot(page, url);

  return {
    command: 'inspect-page',
    url,
    title,
    textPreview: text.slice(0, 5000),
    links,
    buttons,
    htmlPath,
    screenshotPath,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = {
  inspectPage,
};
