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


        summarizeJob(job) {

            return {
                analysisJobId:
                    job.analysis_job_id || null,

                pageSnapshotId:
                    job.page_snapshot_id || null,

                competitorSiteId:
                    job.competitor_site_id || null,

                analysisType:
                    job.analysis_type || null,

                pageTitle:
                    job.page_title || null,

                finalUrl:
                    job.final_url || null
            };

        },


        async handleJob(job) {

            await analysisService.process(job);

        }

    });
}


module.exports = {
    startAnalysisWorker
};
