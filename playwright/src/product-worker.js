const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'competitor_analyzer',
  user: process.env.POSTGRES_USER || 'competitor_user',
  password: process.env.POSTGRES_PASSWORD || 'competitor_password',
});

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(priceText) {
  const cleaned = cleanText(priceText)
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.');

  const price = Number.parseFloat(cleaned);

  if (!Number.isFinite(price)) {
    return null;
  }

  return price;
}

async function getActiveRule() {
  const result = await pool.query(`
    SELECT
      sr.*,
      cs.name AS competitor_name,
      cs.url AS competitor_url
    FROM scraping_rules sr
    JOIN competitor_sites cs
      ON cs.id = sr.competitor_site_id
    WHERE sr.is_active = TRUE
    ORDER BY sr.id
    LIMIT 1
  `);

  return result.rows[0] || null;
}

async function findOrCreateProduct({
  competitorSiteId,
  externalId,
  name,
  url,
}) {
  const existingResult = await pool.query(
    `
      SELECT id
      FROM products
      WHERE competitor_site_id = $1
        AND url = $2
      ORDER BY id
      LIMIT 1
    `,
    [competitorSiteId, url]
  );

  if (existingResult.rows.length > 0) {
    const productId = existingResult.rows[0].id;

    await pool.query(
      `
        UPDATE products
        SET
          name = $1,
          external_id = COALESCE($2, external_id)
        WHERE id = $3
      `,
      [name, externalId, productId]
    );

    return {
      productId,
      created: false,
    };
  }

  const insertResult = await pool.query(
    `
      INSERT INTO products (
        competitor_site_id,
        external_id,
        name,
        url
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [competitorSiteId, externalId, name, url]
  );

  return {
    productId: insertResult.rows[0].id,
    created: true,
  };
}

async function savePrice({
  productId,
  price,
  currency,
}) {
  await pool.query(
    `
      INSERT INTO price_history (
        product_id,
        price,
        currency
      )
      VALUES ($1, $2, $3)
    `,
    [productId, price, currency]
  );
}

async function extractOptionalText(card, selector) {
  if (!selector) {
    return null;
  }

  const element = card.locator(selector).first();

  if ((await element.count()) === 0) {
    return null;
  }

  return cleanText(await element.textContent());
}

async function processRule(rule) {
  const browser = await chromium.launch({
    headless: true,
  });

  let createdProducts = 0;
  let updatedProducts = 0;
  let savedPrices = 0;
  let skippedProducts = 0;

  const processedUrls = new Set();

  try {
    const page = await browser.newPage();

    let currentUrl = rule.start_url;

    console.log('');
    console.log(`Сайт: ${rule.competitor_name}`);
    console.log(`Правило: ${rule.name}`);
    console.log(`Начальная страница: ${currentUrl}`);
    console.log(`Максимум страниц: ${rule.max_pages}`);
    console.log('');

    for (
      let pageNumber = 1;
      pageNumber <= rule.max_pages && currentUrl;
      pageNumber += 1
    ) {
      console.log(`Открываем страницу №${pageNumber}: ${currentUrl}`);

      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const httpStatus = response ? response.status() : null;

      console.log(`HTTP-статус: ${httpStatus ?? 'неизвестен'}`);

      if (httpStatus && httpStatus >= 400) {
        throw new Error(
          `Страница вернула HTTP-статус ${httpStatus}: ${currentUrl}`
        );
      }

      await page.waitForSelector(rule.product_card_selector, {
        timeout: 15000,
      });

      const cards = page.locator(rule.product_card_selector);
      const cardsCount = await cards.count();

      console.log(`Найдено карточек: ${cardsCount}`);

      for (let index = 0; index < cardsCount; index += 1) {
        const card = cards.nth(index);

        const nameElement = card
          .locator(rule.product_name_selector)
          .first();

        const priceElement = card
          .locator(rule.product_price_selector)
          .first();

        const urlElement = rule.product_url_selector
          ? card.locator(rule.product_url_selector).first()
          : null;

        const name =
          cleanText(await nameElement.getAttribute('title')) ||
          cleanText(await nameElement.textContent());

        const priceText = cleanText(
          await priceElement.textContent()
        );

        const price = parsePrice(priceText);

        const relativeUrl = urlElement
          ? await urlElement.getAttribute('href')
          : null;

        const productUrl = relativeUrl
          ? new URL(relativeUrl, page.url()).href
          : null;

        const externalId = await extractOptionalText(
          card,
          rule.product_external_id_selector
        );

        if (!name || price === null || !productUrl) {
          skippedProducts += 1;

          console.log(
            `Пропущена карточка №${index + 1}: недостаточно данных`
          );

          continue;
        }

        if (processedUrls.has(productUrl)) {
          console.log(`Повторная ссылка пропущена: ${productUrl}`);
          continue;
        }

        processedUrls.add(productUrl);

        const productResult = await findOrCreateProduct({
          competitorSiteId: rule.competitor_site_id,
          externalId,
          name,
          url: productUrl,
        });

        if (productResult.created) {
          createdProducts += 1;
        } else {
          updatedProducts += 1;
        }

        await savePrice({
          productId: productResult.productId,
          price,
          currency: rule.currency,
        });

        savedPrices += 1;

        console.log(
          `Сохранён товар: ${name} | ${price.toFixed(2)} ${rule.currency}`
        );
      }

      if (!rule.next_page_selector) {
        console.log('Селектор следующей страницы не задан');
        break;
      }

      const nextPageElement = page
        .locator(rule.next_page_selector)
        .first();

      if ((await nextPageElement.count()) === 0) {
        console.log('Следующая страница не найдена');
        break;
      }

      const nextHref = await nextPageElement.getAttribute('href');

      if (!nextHref) {
        console.log('У ссылки следующей страницы отсутствует href');
        break;
      }

      currentUrl = new URL(nextHref, page.url()).href;

      console.log('');
    }
  } finally {
    await browser.close();
  }

  console.log('');
  console.log('Сбор завершён');
  console.log(`Создано новых товаров: ${createdProducts}`);
  console.log(`Обновлено существующих товаров: ${updatedProducts}`);
  console.log(`Записано цен: ${savedPrices}`);
  console.log(`Пропущено карточек: ${skippedProducts}`);
}

async function main() {
  console.log('Подключаемся к PostgreSQL...');

  const rule = await getActiveRule();

  if (!rule) {
    console.log('Активные правила сбора не найдены');
    return;
  }

  await processRule(rule);
}

main()
  .catch((error) => {
    console.error('');
    console.error('Ошибка product-worker:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
