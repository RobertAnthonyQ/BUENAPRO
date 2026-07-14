-- Borradores de postulacion. No representa ni confirma un envio oficial a SEACE.

CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id BIGINT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready_for_review', 'submitted')),
  quote_type_id SMALLINT,
  validity_date DATE,
  contact_email CITEXT,
  contact_phone TEXT,
  currency TEXT,
  total_amount NUMERIC(14,2),
  seace_quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  seace_contract_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE application_items (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
  seace_item_id BIGINT NOT NULL,
  sequence SMALLINT,
  selected BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  cubso_code TEXT,
  cubso_name TEXT,
  unit_name TEXT,
  quantity NUMERIC(14,4),
  currency_id SMALLINT,
  currency_name TEXT,
  exchange_rate NUMERIC(14,6),
  unit_price NUMERIC(14,2),
  total_price NUMERIC(14,2),
  source_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, seace_item_id)
);

CREATE TABLE application_requirements (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
  seace_requirement_id BIGINT NOT NULL,
  sequence SMALLINT,
  name TEXT NOT NULL,
  requested_value TEXT,
  offered_value TEXT,
  source_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, seace_requirement_id)
);

CREATE TABLE application_documents (
  id BIGSERIAL PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
  seace_document_id BIGINT NOT NULL,
  sequence SMALLINT,
  type_id SMALLINT,
  type_name TEXT,
  filename TEXT NOT NULL,
  extension TEXT,
  mime TEXT,
  size_bytes BIGINT,
  download_path TEXT,
  source_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, seace_document_id)
);

CREATE INDEX ix_application_items_application ON application_items (application_id, sequence);
CREATE INDEX ix_application_requirements_application ON application_requirements (application_id, sequence);
CREATE INDEX ix_application_documents_application ON application_documents (application_id, sequence);
