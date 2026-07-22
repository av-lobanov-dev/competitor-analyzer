CREATE OR REPLACE FUNCTION take_next_analysis_job()
RETURNS TABLE (
  analysis_job_id INTEGER,
  page_snapshot_id INTEGER,
  competitor_site_id INTEGER,
  analysis_type TEXT,
  page_title TEXT,
  final_url TEXT,
  page_text TEXT,
  page_structure JSONB
)
LANGUAGE SQL
AS $$
  WITH candidate AS (
    SELECT aj.id
    FROM analysis_jobs aj
    WHERE aj.status = 'new'
      AND aj.analysis_type = 'site_structure'
    ORDER BY aj.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ),
  claimed AS (
    UPDATE analysis_jobs aj
    SET
      status = 'running',
      started_at = NOW(),
      finished_at = NULL,
      error_message = NULL
    FROM candidate c
    WHERE aj.id = c.id
    RETURNING
      aj.id,
      aj.page_snapshot_id,
      aj.competitor_site_id,
      aj.analysis_type
  )
  SELECT
    c.id AS analysis_job_id,
    c.page_snapshot_id,
    c.competitor_site_id,
    c.analysis_type,
    ps.page_title,
    ps.final_url,
    ps.page_text,
    ps.page_structure
  FROM claimed c
  JOIN page_snapshots ps
    ON ps.id = c.page_snapshot_id;
$$;
