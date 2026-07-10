const fs = require('fs');
const path = require('path');
const { prepareSiteMapRequest } = require('./prepare-site-map-request');

const inputPath = process.argv[2];

if (!inputPath) {
  console.log('Укажи путь к JSON от Playwright');
  console.log('Пример: node src/ai/prepare-request-cli.js /data/export/playwright-results/file.json');
  process.exit(1);
}

const request = prepareSiteMapRequest(inputPath);

const outputDir = '/data/export/gpt-requests';
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, `gpt_request_${Date.now()}.json`);

fs.writeFileSync(outputPath, JSON.stringify(request, null, 2), 'utf-8');

console.log(`GPT-запрос сохранён: ${outputPath}`);
