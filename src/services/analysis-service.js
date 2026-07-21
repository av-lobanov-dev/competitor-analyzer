"use strict";

function createAnalysisService({ logger }) {
    return {
        async process(job) {
            logger.warning(
                "Analysis Service пока работает в безопасном режиме",
                {
                    analysisJobId: job.analysis_job_id,
                    action: "Задача получена, но обработчик ещё не реализован"
                }
            );

            throw new Error(
                "Analysis Service ещё не реализован. Воркер должен оставаться выключенным."
            );
        }
    };
}

module.exports = {
    createAnalysisService
};
