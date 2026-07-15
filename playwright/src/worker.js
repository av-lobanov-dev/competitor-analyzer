const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'competitor_analyzer',
  user: process.env.POSTGRES_USER || 'competitor_user',
  password: process.env.POSTGRES_PASSWORD || 'competitor_password',
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
          load_time_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    return result.rows[0].id;
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

    const snapshot = {
      finalUrl,
      title,
      text: pageText.slice(0, 500000),
      html: pageHtml.slice(0, 2000000),
      httpStatus,
      loadTimeMs,
    };

    console.log(`Заголовок страницы: ${title}`);
    console.log(`Конечный URL: ${finalUrl}`);
    console.log(`HTTP-статус: ${httpStatus}`);
    console.log(`Время загрузки: ${loadTimeMs} мс`);
    console.log(`Размер текста: ${snapshot.text.length} символов`);
    console.log(`Размер HTML: ${snapshot.html.length} символов`);

    const snapshotId = await saveSnapshotAndCompleteJob(job, snapshot);

    console.log(`Снимок страницы сохранён, ID: ${snapshotId}`);
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
