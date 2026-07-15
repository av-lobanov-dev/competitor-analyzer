CREATE TABLE IF NOT EXISTS page_snapshots (
  id SERIAL PRIMARY KEY,
  scan_job_id INTEGER NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  competitor_site_id INTEGER NOT NULL REFERENCES competitor_sites(id) ON DELETE CASCADE,
  requested_url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  page_title TEXT,
  page_text TEXT,
  page_html TEXT,
  http_status INTEGER,
  load_time_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_snapshots_scan_job_id
  ON page_snapshots(scan_job_id);

CREATE INDEX IF NOT EXISTS idx_page_snapshots_competitor_site_id
  ON page_snapshots(competitor_site_id);

CREATE INDEX IF NOT EXISTS idx_page_snapshots_created_at
  ON page_snapshots(created_at);
