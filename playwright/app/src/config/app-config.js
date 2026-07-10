const path = require('path');

const config = {
  browser: {
    headless: true,
    timeout: 60000,
    viewport: {
      width: 1440,
      height: 1000,
    },
  },

  paths: {
    dataDir: '/data',
    storageDir: '/app/storage',
    logsDir: '/logs',
    htmlDir: '/data/cache/html',
    screenshotsDir: '/data/cache/screenshots',
  },

  crawler: {
    maxLinks: 50,
  },
};

module.exports = config;
