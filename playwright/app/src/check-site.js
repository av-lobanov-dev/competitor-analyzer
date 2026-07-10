const { chromium } = require('playwright');

async function main() {
  const url = process.argv[2] || 'https://example.com';

  console.log(`Открываю сайт: ${url}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  const title = await page.title();

  console.log(`Заголовок страницы: ${title}`);

  await page.screenshot({
    path: '/app/storage/check-site.png',
    fullPage: true,
  });

  console.log('Скриншот сохранён: /app/storage/check-site.png');

  await browser.close();
}

main().catch((error) => {
  console.error('Ошибка:', error);
  process.exit(1);
});
