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

async function completeJob(jobId) {
  await pool.query(
    `
      UPDATE scan_jobs
      SET
        status = 'completed',
        finished_at = NOW()
      WHERE id = $1
    `,
    [jobId]
  );
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

    const page = await browser.newPage();

    await page.goto(job.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const title = await page.title();

    console.log(`Заголовок страницы: ${title}`);

    await completeJob(job.job_id);

    console.log(`Задание №${job.job_id} завершено успешно`);
  } catch (error) {
    await failJob(job.job_id);

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
