const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'competitor_analyzer',
  user: process.env.POSTGRES_USER || 'competitor_user',
  password: (() => {
    const password = process.env.POSTGRES_PASSWORD;

    if (!password) {
      throw new Error('POSTGRES_PASSWORD environment variable is required');
    }

    return password;
  })(),
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

async function takeNextJob() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const jobResult = await client.query(`
      SELECT
        psj.id AS job_id,
        psj.scraping_rule_id,
        psj.competitor_site_id,

        sr.name AS rule_name,
        sr.start_url,
        sr.product_card_selector,
        sr.product_name_selector,
        sr.product_price_selector,
        sr.product_url_selector,
        sr.product_external_id_selector,
        sr.product_old_price_selector,
        sr.product_currency_selector,
        sr.next_page_selector,
        sr.max_pages,
        sr.currency,

        cs.name AS competitor_name,
        cs.url AS competitor_url

      FROM product_scan_jobs psj

      JOIN scraping_rules sr
        ON sr.id = psj.scraping_rule_id

      JOIN competitor_sites cs
        ON cs.id = psj.competitor_site_id

      WHERE psj.status = 'new'
        AND sr.is_active = TRUE

      ORDER BY psj.id

      FOR UPDATE OF psj SKIP LOCKED

      LIMIT 1
    `);

    if (jobResult.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const job = jobResult.rows[0];

    await client.query(
      `
        UPDATE product_scan_jobs
        SET
          status = 'running',
          started_at = NOW(),
          finished_at = NULL,
          error_message = NULL
        WHERE id = $1
      `,
      [job.job_id]
    );

    await client.query('COMMIT');

    return job;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  productScanJobId,
  price,
  currency,
}) {
  await pool.query(
    `
      INSERT INTO price_history (
        product_id,
        product_scan_job_id,
        price,
        currency
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      productId,
      productScanJobId,
      price,
      currency,
    ]
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

async function completeJob(jobId, counters) {
  await pool.query(
    `
      UPDATE product_scan_jobs
      SET
        status = 'completed',
        pages_processed = $2,
        products_found = $3,
        products_created = $4,
        products_updated = $5,
        prices_saved = $6,
        products_skipped = $7,
        error_message = NULL,
        finished_at = NOW()
      WHERE id = $1
    `,
    [
      jobId,
      counters.pagesProcessed,
      counters.productsFound,
      counters.productsCreated,
      counters.productsUpdated,
      counters.pricesSaved,
      counters.productsSkipped,
    ]
  );
}

async function failJob(jobId, error) {
  const errorMessage = String(
    error && error.stack
      ? error.stack
      : error
  ).slice(0, 10000);

  await pool.query(
    `
      UPDATE product_scan_jobs
      SET
        status = 'failed',
        error_message = $2,
        finished_at = NOW()
      WHERE id = $1
    `,
    [jobId, errorMessage]
  );
}

async function processJob(job) {
  const browser = await chromium.launch({
    headless: true,
  });

  const counters = {
    pagesProcessed: 0,
    productsFound: 0,
    productsCreated: 0,
    productsUpdated: 0,
    pricesSaved: 0,
    productsSkipped: 0,
  };

  const processedUrls = new Set();

  try {
    const page = await browser.newPage();

    let currentUrl = job.start_url;

    console.log('');
    console.log(`Задание №${job.job_id}`);
    console.log(`Сайт: ${job.competitor_name}`);
    console.log(`Правило: ${job.rule_name}`);
    console.log(`Начальная страница: ${currentUrl}`);
    console.log(`Максимум страниц: ${job.max_pages}`);
    console.log('');

    for (
      let pageNumber = 1;
      pageNumber <= job.max_pages && currentUrl;
      pageNumber += 1
    ) {
      console.log(`Открываем страницу №${pageNumber}: ${currentUrl}`);

      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const httpStatus = response
        ? response.status()
        : null;

      console.log(
        `HTTP-статус: ${httpStatus ?? 'неизвестен'}`
      );

      if (httpStatus && httpStatus >= 400) {
        throw new Error(
          `Страница вернула HTTP-статус ${httpStatus}: ${currentUrl}`
        );
      }

      await page.waitForSelector(
        job.product_card_selector,
        {
          timeout: 15000,
        }
      );

      counters.pagesProcessed += 1;

      const cards = page.locator(
        job.product_card_selector
      );

      const cardsCount = await cards.count();

      counters.productsFound += cardsCount;

      console.log(`Найдено карточек: ${cardsCount}`);

      for (
        let index = 0;
        index < cardsCount;
        index += 1
      ) {
        const card = cards.nth(index);

        const nameElement = card
          .locator(job.product_name_selector)
          .first();

        const priceElement = card
          .locator(job.product_price_selector)
          .first();

        const urlElement = job.product_url_selector
          ? card.locator(job.product_url_selector).first()
          : null;

        const name =
          cleanText(
            await nameElement.getAttribute('title')
          ) ||
          cleanText(
            await nameElement.textContent()
          );

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
          job.product_external_id_selector
        );

        if (
          !name ||
          price === null ||
          !productUrl
        ) {
          counters.productsSkipped += 1;

          console.log(
            `Пропущена карточка №${index + 1}: недостаточно данных`
          );

          continue;
        }

        if (processedUrls.has(productUrl)) {
          counters.productsSkipped += 1;

          console.log(
            `Повторная ссылка пропущена: ${productUrl}`
          );

          continue;
        }

        processedUrls.add(productUrl);

        const productResult =
          await findOrCreateProduct({
            competitorSiteId:
              job.competitor_site_id,
            externalId,
            name,
            url: productUrl,
          });

        if (productResult.created) {
          counters.productsCreated += 1;
        } else {
          counters.productsUpdated += 1;
        }

        await savePrice({
          productId: productResult.productId,
          productScanJobId: job.job_id,
          price,
          currency: job.currency,
        });

        counters.pricesSaved += 1;

        console.log(
          `Сохранён товар: ${name} | ${price.toFixed(2)} ${job.currency}`
        );
      }

      if (!job.next_page_selector) {
        console.log(
          'Селектор следующей страницы не задан'
        );
        break;
      }

      const nextPageElement = page
        .locator(job.next_page_selector)
        .first();

      if ((await nextPageElement.count()) === 0) {
        console.log(
          'Следующая страница не найдена'
        );
        break;
      }

      const nextHref =
        await nextPageElement.getAttribute('href');

      if (!nextHref) {
        console.log(
          'У ссылки следующей страницы отсутствует href'
        );
        break;
      }

      currentUrl = new URL(
        nextHref,
        page.url()
      ).href;

      console.log('');
    }

    return counters;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Подключаемся к PostgreSQL...');

  const job = await takeNextJob();

  if (!job) {
    console.log(
      'Новых заданий на сбор товаров нет'
    );
    return;
  }

  console.log(
    `Получено задание №${job.job_id}`
  );

  try {
    const counters = await processJob(job);

    await completeJob(
      job.job_id,
      counters
    );

    console.log('');
    console.log(
      `Задание №${job.job_id} завершено успешно`
    );

    console.log(
      `Обработано страниц: ${counters.pagesProcessed}`
    );

    console.log(
      `Найдено карточек: ${counters.productsFound}`
    );

    console.log(
      `Создано товаров: ${counters.productsCreated}`
    );

    console.log(
      `Обновлено товаров: ${counters.productsUpdated}`
    );

    console.log(
      `Записано цен: ${counters.pricesSaved}`
    );

    console.log(
      `Пропущено карточек: ${counters.productsSkipped}`
    );
  } catch (error) {
    await failJob(
      job.job_id,
      error
    );

    console.error('');
    console.error(
      `Задание №${job.job_id} завершилось с ошибкой`
    );

    throw error;
  }
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
