"use strict";

const { sleep } = require("../utils/sleep");


async function runPollingWorker({
    name,
    pollIntervalMs,
    takeJob,
    handleJob,
    beforeCycle,
    summarizeJob,
    logger,
    signal
}) {
    logger.info(`${name}: запущен`);


    while (!signal.stopped) {
        try {

            if (beforeCycle) {
                await beforeCycle();
            }


            const job = await takeJob();


            if (!job) {
                await sleep(pollIntervalMs);
                continue;
            }


            const jobContext =
                typeof summarizeJob === "function"
                    ? summarizeJob(job)
                    : {
                        jobId:
                            job.id ||
                            job.job_id ||
                            job.analysis_job_id ||
                            null
                    };


            logger.info(
                `${name}: получена задача`,
                jobContext
            );


            await handleJob(job);


        } catch (error) {

            logger.error(`${name}: ошибка цикла`, {
                message: error.message,
                stack: error.stack
            });


            await sleep(pollIntervalMs);
        }
    }


    logger.info(`${name}: остановлен`);
}


module.exports = {
    runPollingWorker
};
