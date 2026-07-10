const config = require('../config/app-config');
const logger = require('../utils/logger');
const { saveHtml, saveScreenshot } = require('../storage/save-page');

async function crawlPage(page, url) {
  logger.info(`Открываю сайт: ${url}`);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: config.browser.timeout,
  });

  const title = await page.title();

  logger.info(`Заголовок страницы: ${title}`);

  const links = await page.$$eval('a[href]', (elements) => {
    return elements
      .map((element) => {
        return {
          text: element.innerText.trim(),
          href: element.href,
        };
      })
      .filter((link) => link.href);
  });

  const limitedLinks = links.slice(0, config.crawler.maxLinks);

  logger.info(`Найдено ссылок: ${links.length}`);
  logger.info(`Сохранено в отчёт ссылок: ${limitedLinks.length}`);

  const htmlPath = await saveHtml(page, url);
  const screenshotPath = await saveScreenshot(page, url);

  return {
    url,
    title,
    linksCount: links.length,
    links: limitedLinks,
    htmlPath,
    screenshotPath,
  };
}

module.exports = {
  crawlPage,
};

