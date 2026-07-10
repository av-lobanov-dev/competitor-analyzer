const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readPrompt(promptPath) {
  return fs.readFileSync(promptPath, 'utf-8');
}

function prepareSiteMapRequest(playwrightResultPath) {
  const promptPath = '/prompts/site-analysis/site-map-prompt.md';

  const systemPrompt = readPrompt(promptPath);
  const playwrightResult = readJson(playwrightResultPath);

  return {
    task: 'site-map-analysis',
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: JSON.stringify(playwrightResult, null, 2)
      }
    ],
    expected_output: 'strict_json'
  };
}

module.exports = {
  prepareSiteMapRequest,
};
