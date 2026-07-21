"use strict";

const { Pool } = require("pg");

function createDatabasePool(config) {
    const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.maxConnections,
        connectionTimeoutMillis: config.connectionTimeoutMs,
        idleTimeoutMillis: 30000,
        application_name: "competitor-analyzer-worker"
    });

    return pool;
}

async function verifyDatabaseConnection(pool) {
    const result = await pool.query(`
        SELECT
            current_database() AS database_name,
            current_user AS database_user,
            version() AS postgres_version,
            NOW() AS server_time
    `);

    return result.rows[0];
}

module.exports = {
    createDatabasePool,
    verifyDatabaseConnection
};
