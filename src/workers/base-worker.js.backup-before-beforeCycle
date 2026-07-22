"use strict";

const { sleep } = require("../utils/sleep");

async function runPollingWorker({
    name,
    pollIntervalMs,
    takeJob,
    handleJob,
    logger,
    signal
}) {
    logger.info(`${name}: запущен`);

    while (!signal.stopped) {
        try {
            const job = await takeJob();

            if (!job) {
                await sleep(pollIntervalMs);
                continue;
            }

            logger.info(`${name}: получена задача`, {
                job
            });

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
