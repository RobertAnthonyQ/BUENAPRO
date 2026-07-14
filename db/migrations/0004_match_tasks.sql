-- Checklist operativo de postulacion por oportunidad.

CREATE TABLE IF NOT EXISTS match_tasks (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'blocked', 'skipped')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('system', 'facet', 'manual')),
  due_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_match_tasks_match
  ON match_tasks (match_id, status, created_at);
