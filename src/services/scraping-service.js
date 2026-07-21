"use strict";

function createScrapingService({ logger }) {
    return {
        async process(job) {
            logger.warning(
                "Scraping Service пока работает в безопасном режиме",
                {
                    analysisJobId: job.analysis_job_id,
                    action: "Задача получена, но обработчик ещё не реализован"
                }
            );

            throw new Error(
                "Scraping Service ещё не реализован. Воркер должен оставаться выключенным."
            );
        }
    };
}

module.exports = {
    createScrapingService
};
