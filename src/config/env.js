"use strict";

function getEnv(name, fallback = undefined) {
    const value = process.env[name];

    if (value !== undefined && value !== "") {
        return value;
    }

    if (fallback !== undefined) {
        return fallback;
    }

    throw new Error(`Не задана обязательная переменная окружения: ${name}`);
}

function getIntegerEnv(name, fallback) {
    const rawValue = getEnv(name, String(fallback));
    const value = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(
            `Переменная ${name} должна быть неотрицательным целым числом`
        );
    }

    return value;
}

function loadConfig() {
    return {
        app: {
            name: getEnv("APP_NAME", "competitor-analyzer"),
            environment: getEnv("NODE_ENV", "production"),
            pollIntervalMs: getIntegerEnv("WORKER_POLL_INTERVAL_MS", 15000),
            enableAnalysisWorker:
                getEnv("ENABLE_ANALYSIS_WORKER", "false") === "true",
            enableScrapingWorker:
                getEnv("ENABLE_SCRAPING_WORKER", "false") === "true",
            enableLegacyWorker:
                getEnv("ENABLE_LEGACY_WORKER", "true") === "true"
        },
        database: {
            host: getEnv("POSTGRES_HOST", "postgres"),
            port: getIntegerEnv("POSTGRES_PORT", 5432),
            database: getEnv(
                "POSTGRES_DB",
                getEnv("DB_POSTGRESDB_DATABASE", "competitor_analyzer")
            ),
            user: getEnv(
                "POSTGRES_USER",
                getEnv("DB_POSTGRESDB_USER", "competitor_user")
            ),
            password: getEnv(
                "POSTGRES_PASSWORD",
                getEnv("DB_POSTGRESDB_PASSWORD", "")
            ),
            maxConnections: getIntegerEnv("POSTGRES_POOL_MAX", 5),
            connectionTimeoutMs: getIntegerEnv(
                "POSTGRES_CONNECTION_TIMEOUT_MS",
                5000
            )
        }
    };
}

module.exports = {
    getEnv,
    getIntegerEnv,
    loadConfig
};
