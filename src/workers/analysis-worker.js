"use strict";

const {
    takeNextAnalysisJob,
    recoverStuckAnalysisJobs
} = require("../queue/analysis-queue");

const {
    runPollingWorker
} = require("./base-worker");


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


        async beforeCycle() {

            const recovered =
                await recoverStuckAnalysisJobs(pool);


            if (recovered > 0) {

                logger.info(
                    "Analysis Worker: восстановлены зависшие задачи",
                    {
                        recovered
                    }
                );

            }

        },


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