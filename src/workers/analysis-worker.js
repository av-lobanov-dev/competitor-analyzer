"use strict";

const { takeNextAnalysisJob } = require("../queue/analysis-queue");
const { runPollingWorker } = require("./base-worker");

function startAnalysisWorker({
    pool,
    pollIntervalMs,
    logger,
    signal,
    analysisService
}) {
    return runPollingWorker({
        name: "Analysis Worker",
        pollIntervalMs,
        logger,
        signal,

        takeJob() {
            return takeNextAnalysisJob(pool);
        },

        async handleJob(job) {
            await analysisService.process(job);
        }
    });
}

module.exports = {
    startAnalysisWorker
};
