CREATE OR REPLACE FUNCTION complete_analysis_job(
  p_analysis_job_id INTEGER,
  p_result_json JSONB,
  p_model_name TEXT,
  p_prompt_version TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE analysis_jobs
  SET
    status = 'completed',
    result_json = p_result_json,
    model_name = p_model_name,
    prompt_version = p_prompt_version,
    error_message = NULL,
    finished_at = NOW()
  WHERE id = p_analysis_job_id
    AND status = 'running';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  RETURN updated_rows = 1;
END;
$$;


CREATE OR REPLACE FUNCTION fail_analysis_job(
  p_analysis_job_id INTEGER,
  p_error_message TEXT,
  p_model_name TEXT DEFAULT NULL,
  p_prompt_version TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE analysis_jobs
  SET
    status = 'failed',
    result_json = NULL,
    error_message = p_error_message,
    model_name = p_model_name,
    prompt_version = p_prompt_version,
    finished_at = NOW()
  WHERE id = p_analysis_job_id
    AND status = 'running';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  RETURN updated_rows = 1;
END;
$$;
