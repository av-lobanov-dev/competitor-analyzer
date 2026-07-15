CREATE TABLE IF NOT EXISTS analysis_jobs (
  id SERIAL PRIMARY KEY,

  page_snapshot_id INTEGER NOT NULL
    REFERENCES page_snapshots(id)
    ON DELETE CASCADE,

  competitor_site_id INTEGER NOT NULL
    REFERENCES competitor_sites(id)
    ON DELETE CASCADE,

  analysis_type TEXT NOT NULL DEFAULT 'site_structure',

  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'running', 'completed', 'failed')),

  result_json JSONB,

  error_message TEXT,

  model_name TEXT,
  prompt_version TEXT,

  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status
  ON analysis_jobs(status);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_page_snapshot_id
  ON analysis_jobs(page_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_competitor_site_id
  ON analysis_jobs(competitor_site_id);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at
  ON analysis_jobs(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_jobs_unique_snapshot_type
  ON analysis_jobs(page_snapshot_id, analysis_type);
