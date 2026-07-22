CREATE OR REPLACE FUNCTION recover_stuck_analysis_jobs(
    p_timeout_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE SQL
AS $$
    WITH recovered AS (
        UPDATE analysis_jobs
        SET
            status = 'new',
            started_at = NULL,
            error_message = NULL
        WHERE status = 'running'
          AND started_at < NOW() - (
              p_timeout_minutes || ' minutes'
          )::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER
    FROM recovered;
$$;
