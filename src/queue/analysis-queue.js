"use strict";

async function takeNextAnalysisJob(pool) {
    const result = await pool.query(
        "SELECT * FROM public.take_next_analysis_job()"
    );

    return result.rows[0] || null;
}

async function completeAnalysisJob(
    pool,
    analysisJobId,
    resultJson,
    modelName,
    promptVersion
) {
    const result = await pool.query(
        `
            SELECT public.complete_analysis_job(
                $1,
                $2::jsonb,
                $3,
                $4
            ) AS completed
        `,
        [
            analysisJobId,
            JSON.stringify(resultJson),
            modelName,
            promptVersion
        ]
    );

    return result.rows[0]?.completed === true;
}

async function failAnalysisJob(
    pool,
    analysisJobId,
    errorMessage,
    modelName = null,
    promptVersion = null
) {
    const result = await pool.query(
        `
            SELECT public.fail_analysis_job(
                $1,
                $2,
                $3,
                $4
            ) AS failed
        `,
        [
            analysisJobId,
            errorMessage,
            modelName,
            promptVersion
        ]
    );

    return result.rows[0]?.failed === true;
}

module.exports = {
    takeNextAnalysisJob,
    completeAnalysisJob,
    failAnalysisJob
};
