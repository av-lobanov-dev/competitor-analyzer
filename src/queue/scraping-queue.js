"use strict";

async function takeNextScrapingRuleJob(pool) {
    const result = await pool.query(
        "SELECT * FROM public.take_next_scraping_rule_job()"
    );

    return result.rows[0] || null;
}

module.exports = {
    takeNextScrapingRuleJob
};
