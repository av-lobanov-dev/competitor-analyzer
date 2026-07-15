ALTER TABLE page_snapshots
  ADD COLUMN IF NOT EXISTS page_structure JSONB;

CREATE INDEX IF NOT EXISTS idx_page_snapshots_page_structure_gin
  ON page_snapshots USING GIN (page_structure);
