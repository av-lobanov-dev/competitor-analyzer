"use strict";

const {
    takeNextScrapingRuleJob
} = require("../queue/scraping-queue");

const { runPollingWorker } = require("./base-worker");

function startScrapingWorker({
    pool,
    pollIntervalMs,
    logger,
    signal,
    scrapingService
}) {
    return runPollingWorker({
        name: "Scraping Worker",
        pollIntervalMs,
        logger,
        signal,

        takeJob() {
            return takeNextScrapingRuleJob(pool);
        },

        async handleJob(job) {
            await scrapingService.process(job);
        }
    });
}

module.exports = {
    startScrapingWorker
};
