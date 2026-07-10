CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_sites (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    name TEXT,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_jobs (
    id SERIAL PRIMARY KEY,
    competitor_site_id INTEGER REFERENCES competitor_sites(id),
    status TEXT NOT NULL DEFAULT 'new',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    competitor_site_id INTEGER REFERENCES competitor_sites(id),
    external_id TEXT,
    name TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    price NUMERIC(12, 2),
    currency TEXT DEFAULT 'EUR',
    collected_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_maps (
    id SERIAL PRIMARY KEY,
    competitor_site_id INTEGER REFERENCES competitor_sites(id),
    map_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
