"use strict";

const { loadConfig } = require("./config/env");
const { createApp } = require("./app/create-app");
const { logger } = require("./utils/logger");

async function main() {
    const config = loadConfig();
    const app = createApp({
        config,
        logger
    });

    let stopping = false;

    async function shutdown(signalName) {
        if (stopping) {
            return;
        }

        stopping = true;

        logger.info("Получен сигнал остановки", {
            signal: signalName
        });

        try {
            await app.stop();
            process.exitCode = 0;
        } catch (error) {
            logger.error("Ошибка остановки приложения", {
                message: error.message,
                stack: error.stack
            });

            process.exitCode = 1;
        }
    }

    process.on("SIGTERM", () => {
        shutdown("SIGTERM");
    });

    process.on("SIGINT", () => {
        shutdown("SIGINT");
    });

    process.on("unhandledRejection", (reason) => {
        logger.error("Необработанное отклонение Promise", {
            reason: String(reason)
        });

        process.exitCode = 1;
    });

    process.on("uncaughtException", (error) => {
        logger.error("Необработанная ошибка", {
            message: error.message,
            stack: error.stack
        });

        process.exitCode = 1;
    });

    await app.start();
}

main().catch((error) => {
    logger.error("Приложение не удалось запустить", {
        message: error.message,
        stack: error.stack
    });

    process.exitCode = 1;
});
