CREATE TABLE IF NOT EXISTS product_scan_jobs (
    id SERIAL PRIMARY KEY,

    scraping_rule_id INTEGER NOT NULL
        REFERENCES scraping_rules(id)
        ON DELETE CASCADE,

    competitor_site_id INTEGER NOT NULL
        REFERENCES competitor_sites(id)
        ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'new',

    pages_processed INTEGER NOT NULL DEFAULT 0,
    products_found INTEGER NOT NULL DEFAULT 0,
    products_created INTEGER NOT NULL DEFAULT 0,
    products_updated INTEGER NOT NULL DEFAULT 0,
    prices_saved INTEGER NOT NULL DEFAULT 0,
    products_skipped INTEGER NOT NULL DEFAULT 0,

    error_message TEXT,

    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITHOUT TIME ZONE,
    finished_at TIMESTAMP WITHOUT TIME ZONE,

    CONSTRAINT product_scan_jobs_status_check
        CHECK (status IN ('new', 'running', 'completed', 'failed')),

    CONSTRAINT product_scan_jobs_counters_check
        CHECK (
            pages_processed >= 0
            AND products_found >= 0
            AND products_created >= 0
            AND products_updated >= 0
            AND prices_saved >= 0
            AND products_skipped >= 0
        )
);

CREATE INDEX IF NOT EXISTS idx_product_scan_jobs_status
    ON product_scan_jobs (status);

CREATE INDEX IF NOT EXISTS idx_product_scan_jobs_rule_id
    ON product_scan_jobs (scraping_rule_id);

CREATE INDEX IF NOT EXISTS idx_product_scan_jobs_competitor_site_id
    ON product_scan_jobs (competitor_site_id);

CREATE INDEX IF NOT EXISTS idx_product_scan_jobs_created_at
    ON product_scan_jobs (created_at);
