CREATE TABLE IF NOT EXISTS scraping_rules (
    id SERIAL PRIMARY KEY,

    competitor_site_id INTEGER NOT NULL
        REFERENCES competitor_sites(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL DEFAULT 'Основное правило',

    start_url TEXT NOT NULL,

    product_card_selector TEXT NOT NULL,
    product_name_selector TEXT NOT NULL,
    product_price_selector TEXT NOT NULL,

    product_url_selector TEXT,
    product_external_id_selector TEXT,
    product_old_price_selector TEXT,
    product_currency_selector TEXT,

    next_page_selector TEXT,

    max_pages INTEGER NOT NULL DEFAULT 1,

    currency TEXT NOT NULL DEFAULT 'EUR',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT scraping_rules_max_pages_check
        CHECK (max_pages > 0)
);

CREATE INDEX IF NOT EXISTS idx_scraping_rules_competitor_site_id
    ON scraping_rules (competitor_site_id);

CREATE INDEX IF NOT EXISTS idx_scraping_rules_is_active
    ON scraping_rules (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scraping_rules_one_active_per_site
    ON scraping_rules (competitor_site_id)
    WHERE is_active = TRUE;
