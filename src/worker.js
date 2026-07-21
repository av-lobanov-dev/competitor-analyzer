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

async function takeNextJob() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(`
      SELECT
        sj.id AS job_id,
        cs.id AS competitor_site_id,
        cs.name AS competitor_name,
        cs.url
      FROM scan_jobs sj
      JOIN competitor_sites cs
        ON cs.id = sj.competitor_site_id
      WHERE sj.status = 'new'
      ORDER BY sj.created_at ASC
      FOR UPDATE OF sj SKIP LOCKED
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const job = result.rows[0];

    await client.query(
      `
        UPDATE scan_jobs
        SET
          status = 'running',
          started_at = NOW(),
          finished_at = NULL
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

async function saveSnapshotAndCompleteJob(job, snapshot) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        INSERT INTO page_snapshots (
          scan_job_id,
          competitor_site_id,
          requested_url,
          final_url,
          page_title,
          page_text,
          page_html,
          http_status,
          load_time_ms,
          page_structure
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        RETURNING id
      `,
      [
        job.job_id,
        job.competitor_site_id,
        job.url,
        snapshot.finalUrl,
        snapshot.title,
        snapshot.text,
        snapshot.html,
        snapshot.httpStatus,
        snapshot.loadTimeMs,
        JSON.stringify(snapshot.structure),
      ]
    );

    const snapshotId = result.rows[0].id;

    const analysisJobResult = await client.query(
      `
        INSERT INTO analysis_jobs (
          page_snapshot_id,
          competitor_site_id,
          analysis_type,
          status
        )
        VALUES ($1, $2, 'site_structure', 'new')
        ON CONFLICT (page_snapshot_id, analysis_type)
        DO NOTHING
        RETURNING id
      `,
      [
        snapshotId,
        job.competitor_site_id,
      ]
    );

    await client.query(
      `
        UPDATE scan_jobs
        SET
          status = 'completed',
          finished_at = NOW()
        WHERE id = $1
      `,
      [job.job_id]
    );

    await client.query('COMMIT');

    return {
      snapshotId,
      analysisJobId:
        analysisJobResult.rows.length > 0
          ? analysisJobResult.rows[0].id
          : null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function failJob(jobId) {
  await pool.query(
    `
      UPDATE scan_jobs
      SET
        status = 'failed',
        finished_at = NOW()
      WHERE id = $1
    `,
    [jobId]
  );
}

async function extractPageStructure(page) {
  return page.evaluate(() => {
    const normalizeText = (value) =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    const makeAbsoluteUrl = (value) => {
      if (!value) {
        return null;
      }

      try {
        return new URL(value, window.location.href).href;
      } catch {
        return null;
      }
    };

    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    )
      .map((element) => ({
        level: Number(element.tagName.substring(1)),
        text: normalizeText(element.innerText),
      }))
      .filter((item) => item.text)
      .slice(0, 200);

    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((element) => ({
        text: normalizeText(element.innerText),
        url: makeAbsoluteUrl(element.getAttribute('href')),
        title: normalizeText(element.getAttribute('title')),
      }))
      .filter((item) => item.url)
      .slice(0, 1000);

    const buttons = Array.from(
      document.querySelectorAll(
        'button, input[type="button"], input[type="submit"], [role="button"]'
      )
    )
      .map((element) => ({
        text: normalizeText(
          element.innerText ||
            element.getAttribute('value') ||
            element.getAttribute('aria-label') ||
            element.getAttribute('title')
        ),
        type:
          element.getAttribute('type') ||
          element.getAttribute('role') ||
          element.tagName.toLowerCase(),
        disabled:
          element.disabled === true ||
          element.getAttribute('aria-disabled') === 'true',
      }))
      .filter((item) => item.text)
      .slice(0, 500);

    const inputs = Array.from(
      document.querySelectorAll('input, select, textarea')
    )
      .map((element) => {
        const id = element.getAttribute('id');

        let label = '';

        if (id) {
          const labelElement = document.querySelector(
            `label[for="${CSS.escape(id)}"]`
          );

          if (labelElement) {
            label = normalizeText(labelElement.innerText);
          }
        }

        return {
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || null,
          name: element.getAttribute('name') || null,
          placeholder: normalizeText(element.getAttribute('placeholder')),
          label,
          ariaLabel: normalizeText(element.getAttribute('aria-label')),
        };
      })
      .slice(0, 500);

    const images = Array.from(document.querySelectorAll('img'))
      .map((element) => ({
        src: makeAbsoluteUrl(
          element.currentSrc || element.getAttribute('src')
        ),
        alt: normalizeText(element.getAttribute('alt')),
        title: normalizeText(element.getAttribute('title')),
        width: element.naturalWidth || element.width || null,
        height: element.naturalHeight || element.height || null,
      }))
      .filter((item) => item.src)
      .slice(0, 1000);

    const possibleProductCards = Array.from(
      document.querySelectorAll(
        [
          '[itemtype*="Product"]',
          '[data-product]',
          '[data-product-id]',
          '[class*="product"]',
          '[class*="Product"]',
          '[class*="card"]',
          '[class*="Card"]',
        ].join(',')
      )
    )
      .map((element) => {
        const text = normalizeText(element.innerText);

        const priceMatch = text.match(
          /(?:₽|руб\.?|р\.?|\$|€|£)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:₽|руб\.?|р\.?|\$|€|£)/i
        );

        const linkElement = element.querySelector('a[href]');
        const imageElement = element.querySelector('img');

        return {
          text: text.slice(0, 1000),
          url: linkElement
            ? makeAbsoluteUrl(linkElement.getAttribute('href'))
            : null,
          image: imageElement
            ? makeAbsoluteUrl(
                imageElement.currentSrc || imageElement.getAttribute('src')
              )
            : null,
          priceText: priceMatch ? normalizeText(priceMatch[0]) : null,
        };
      })
      .filter((item) => item.text && (item.url || item.priceText))
      .slice(0, 500);

    return {
      page: {
        title: document.title,
        url: window.location.href,
        language: document.documentElement.lang || null,
      },
      headings,
      links,
      buttons,
      inputs,
      images,
      possibleProductCards,
      counts: {
        headings: headings.length,
        links: links.length,
        buttons: buttons.length,
        inputs: inputs.length,
        images: images.length,
        possibleProductCards: possibleProductCards.length,
      },
    };
  });
}

async function scanSite(job) {
  let browser;

  try {
    console.log(`Начинаем задание №${job.job_id}`);
    console.log(`Конкурент: ${job.competitor_name}`);
    console.log(`URL: ${job.url}`);

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    const startedAt = Date.now();

    const response = await page.goto(job.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const loadTimeMs = Date.now() - startedAt;

    const title = await page.title();
    const finalUrl = page.url();
    const httpStatus = response ? response.status() : null;

    const pageText = await page
      .locator('body')
      .innerText({ timeout: 10000 })
      .catch(() => '');

    const pageHtml = await page.content();
    const pageStructure = await extractPageStructure(page);

    const snapshot = {
      finalUrl,
      title,
      text: pageText.slice(0, 500000),
      html: pageHtml.slice(0, 2000000),
      httpStatus,
      loadTimeMs,
      structure: pageStructure,
    };

    console.log(`Заголовок страницы: ${title}`);
    console.log(`Конечный URL: ${finalUrl}`);
    console.log(`HTTP-статус: ${httpStatus}`);
    console.log(`Время загрузки: ${loadTimeMs} мс`);
    console.log(`Размер текста: ${snapshot.text.length} символов`);
    console.log(`Размер HTML: ${snapshot.html.length} символов`);
    console.log(
      `Структура страницы: ${JSON.stringify(snapshot.structure.counts)}`
    );

    const savedResult = await saveSnapshotAndCompleteJob(job, snapshot);

    console.log(
      `Снимок страницы сохранён, ID: ${savedResult.snapshotId}`
    );

    if (savedResult.analysisJobId) {
      console.log(
        `Создано задание для GPT, ID: ${savedResult.analysisJobId}`
      );
    } else {
      console.log('Задание для GPT уже существовало');
    }
    console.log(`Задание №${job.job_id} завершено успешно`);
  } catch (error) {
    try {
      await failJob(job.job_id);
    } catch (databaseError) {
      console.error('Не удалось изменить статус задания на failed:');
      console.error(databaseError);
    }

    console.error(`Задание №${job.job_id} завершилось с ошибкой`);
    console.error(error);

    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  try {
    console.log('Подключаемся к PostgreSQL...');

    const job = await takeNextJob();

    if (!job) {
      console.log('Новых заданий нет');
      return;
    }

    await scanSite(job);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Критическая ошибка worker:');
  console.error(error);
  process.exit(1);
});
