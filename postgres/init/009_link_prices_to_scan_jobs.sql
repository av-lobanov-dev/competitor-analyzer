ALTER TABLE price_history
ADD COLUMN IF NOT EXISTS product_scan_job_id INTEGER;

ALTER TABLE price_history
ADD CONSTRAINT price_history_product_scan_job_id_fkey
FOREIGN KEY (product_scan_job_id)
REFERENCES product_scan_jobs(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_price_history_product_scan_job_id
ON price_history(product_scan_job_id);
