SET TIME ZONE 'UTC';

ALTER TABLE tdr_extractions
  ADD COLUMN IF NOT EXISTS reused_from_extraction_id BIGINT REFERENCES tdr_extractions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_tdr_extractions_reused_from
  ON tdr_extractions (reused_from_extraction_id);
