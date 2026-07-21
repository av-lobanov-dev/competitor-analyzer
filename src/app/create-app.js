"use strict";

const {
    createDatabasePool,
    verifyDatabaseConnection
} = require("../db/pool");

const {
    createAnalysisService
} = require("../services/analysis-service");

const {
    createScrapingService
} = require("../services/scraping-service");

const {
    startAnalysisWorker
} = require("../workers/analysis-worker");

const {
    startScrapingWorker
} = require("../workers/scraping-worker");

function createApp({ config, logger }) {
    const pool = createDatabasePool(config.database);
    const signal = {
        stopped: false
    };

    const runningWorkers = [];

    async function start() {
        const databaseInfo = await verifyDatabaseConnection(pool);

        logger.info("Подключение к PostgreSQL установлено", {
            database: databaseInfo.database_name,
            user: databaseInfo.database_user,
            serverTime: databaseInfo.server_time
        });

        if (config.app.enableAnalysisWorker) {
            const analysisService = createAnalysisService({
                logger
            });

            runningWorkers.push(
                startAnalysisWorker({
                    pool,
                    pollIntervalMs: config.app.pollIntervalMs,
                    logger,
                    signal,
                    analysisService
                })
            );
        } else {
            logger.info("Analysis Worker отключён");
        }

        if (config.app.enableScrapingWorker) {
            const scrapingService = createScrapingService({
                logger
            });

            runningWorkers.push(
                startScrapingWorker({
                    pool,
                    pollIntervalMs: config.app.pollIntervalMs,
                    logger,
                    signal,
                    scrapingService
                })
            );
        } else {
            logger.info("Scraping Worker отключён");
        }

        logger.info("Каркас приложения запущен", {
            activeWorkers: runningWorkers.length,
            pollIntervalMs: config.app.pollIntervalMs
        });
    }

    async function stop() {
        signal.stopped = true;

        await Promise.allSettled(runningWorkers);
        await pool.end();

        logger.info("Приложение остановлено");
    }

    return {
        start,
        stop
    };
}

module.exports = {
    createApp
};
