const { createBrowser, createPage } = require('./browser/browser');
const { inspectPage } = require('./commands/inspect-page');
const { saveResult } = require('./output/save-result');
const logger = require('./utils/logger');
const { prepareSiteMapRequest } = require('./ai/prepare-site-map-request');

async function main() {
  const command = process.argv[2];
  const url = process.argv[3];

  if (!command || !url) {
    console.log('Использование: npm start -- <command> <url>');
    console.log('');
    console.log('Пример:');
    console.log('npm start -- inspect-page https://example.com');
    process.exit(1);
  }

  let browser;

  try {
    browser = await createBrowser();
    const page = await createPage(browser);

    let result;

    if (command === 'inspect-page') {
      result = await inspectPage(page, url);
    } else {
      throw new Error(`Неизвестная команда: ${command}`);
    }

    const resultPath = saveResult(result);

    console.log('');
    console.log('=== РЕЗУЛЬТАТ ДЛЯ GPT ===');
    console.log(`JSON сохранён: ${resultPath}`);
    console.log('');
    console.log(JSON.stringify({
      command: result.command,
      url: result.url,
      title: result.title,
      linksCount: result.links.length,
      buttonsCount: result.buttons.length,
      htmlPath: result.htmlPath,
      screenshotPath: result.screenshotPath,
      resultPath,
    }, null, 2));

  } catch (err) {
    logger.error('Ошибка выполнения команды', err);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Браузер закрыт');
    }
  }
}

main();