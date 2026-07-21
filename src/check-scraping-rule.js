const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  try {
    const url = 'https://books.toscrape.com/';

    console.log(`Открываем страницу: ${url}`);

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log(`HTTP-статус: ${response ? response.status() : 'неизвестен'}`);

    const productCardSelector = 'article.product_pod';
    const productNameSelector = 'h3 a';
    const productPriceSelector = '.price_color';
    const productUrlSelector = 'h3 a';
    const nextPageSelector = 'li.next a';

    await page.waitForSelector(productCardSelector, {
      timeout: 15000,
    });

    const cards = page.locator(productCardSelector);
    const cardsCount = await cards.count();

    console.log(`Найдено карточек товаров: ${cardsCount}`);

    const previewCount = Math.min(cardsCount, 5);

    for (let index = 0; index < previewCount; index += 1) {
      const card = cards.nth(index);

      const nameElement = card.locator(productNameSelector).first();
      const priceElement = card.locator(productPriceSelector).first();
      const urlElement = card.locator(productUrlSelector).first();

      const name =
        (await nameElement.getAttribute('title')) ||
        (await nameElement.textContent()) ||
        '';

      const price = (await priceElement.textContent()) || '';
      const relativeUrl = await urlElement.getAttribute('href');

      const absoluteUrl = relativeUrl
        ? new URL(relativeUrl, page.url()).href
        : null;

      console.log('');
      console.log(`Товар №${index + 1}`);
      console.log(`Название: ${name.trim()}`);
      console.log(`Цена: ${price.trim()}`);
      console.log(`Ссылка: ${absoluteUrl}`);
    }

    const nextPageExists =
      (await page.locator(nextPageSelector).count()) > 0;

    console.log('');
    console.log(
      `Кнопка следующей страницы найдена: ${
        nextPageExists ? 'да' : 'нет'
      }`
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Ошибка проверки правила:');
  console.error(error);
  process.exit(1);
});
