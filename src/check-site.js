const { chromium } = require('playwright');

async function main() {
  const url = process.argv[2] || 'https://example.com';

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const title = await page.title();

  console.log('URL:', url);
  console.log('TITLE:', title);

  await browser.close();
}

main().catch((error) => {
  console.error('ERROR:', error);
  process.exit(1);
});
