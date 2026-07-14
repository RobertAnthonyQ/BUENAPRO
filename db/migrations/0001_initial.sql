-- BuenaPro initial schema.
-- Convention: store all timestamps as timestamptz in UTC; render in America/Lima.

SET TIME ZONE 'UTC';

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'equipos')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE cat_seace_objects (
  codigo SMALLINT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO cat_seace_objects (codigo, nombre) VALUES
  (1, 'Bien'),
  (2, 'Servicio'),
  (3, 'Obra'),
  (4, 'Consultoria de Obra')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

CREATE TABLE cat_seace_states (
  codigo SMALLINT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO cat_seace_states (codigo, nombre) VALUES
  (2, 'Vigente'),
  (3, 'En Evaluacion'),
  (4, 'Culminado')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

CREATE TABLE cat_cubso_segmentos (
  codigo TEXT NOT NULL,
  anio SMALLINT NOT NULL,
  nombre TEXT NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (codigo, anio)
);

CREATE TABLE mvp_enabled_cubso_segments (
  codigo TEXT NOT NULL,
  anio SMALLINT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('tecnologia', 'transporte', 'legal')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (codigo, anio, bucket),
  FOREIGN KEY (codigo, anio) REFERENCES cat_cubso_segmentos(codigo, anio)
);

CREATE TABLE cat_entidades (
  codigo TEXT PRIMARY KEY,
  ruc TEXT,
  nombre TEXT NOT NULL,
  nivel TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_cat_entidades_nombre_trgm
  ON cat_entidades USING gin (nombre gin_trgm_ops);

CREATE TABLE cat_ubigeo (
  codigo TEXT PRIMARY KEY,
  departamento TEXT NOT NULL,
  provincia TEXT,
  distrito TEXT
);

CREATE TABLE seace_contracts (
  id_contrato BIGINT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  anio SMALLINT NOT NULL,
  entidad_codigo TEXT REFERENCES cat_entidades(codigo),
  entidad_nombre TEXT,
  objeto_codigo SMALLINT NOT NULL REFERENCES cat_seace_objects(codigo),
  estado_codigo SMALLINT NOT NULL REFERENCES cat_seace_states(codigo),
  descripcion TEXT NOT NULL,
  cubso_segmento TEXT,
  cubso_item TEXT,
  ubigeo TEXT REFERENCES cat_ubigeo(codigo),
  departamento TEXT,
  provincia TEXT,
  distrito TEXT,
  valor_estimado NUMERIC(14,2),
  valor_no_informado BOOLEAN NOT NULL DEFAULT true,
  cotizar BOOLEAN,
  fec_publica TIMESTAMPTZ,
  fec_ini_cotizacion TIMESTAMPTZ,
  fec_fin_cotizacion TIMESTAMPTZ,
  cronograma JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_state TEXT NOT NULL DEFAULT 'discovered'
    CHECK (pipeline_state IN (
      'discovered',
      'detail_fetched',
      'files_listed',
      'downloaded',
      'classified',
      'extracted',
      'validated',
      'normalized',
      'matched',
      'closed',
      'awarded',
      'failed'
    )),
  hash_search TEXT NOT NULL,
  hash_detail TEXT,
  hash_files TEXT,
  raw_search_json JSONB NOT NULL,
  raw_detail_json JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_contracts_feed
  ON seace_contracts (estado_codigo, fec_fin_cotizacion)
  WHERE estado_codigo = 2;
CREATE INDEX ix_contracts_cubso ON seace_contracts (cubso_segmento, anio);
CREATE INDEX ix_contracts_object_state ON seace_contracts (objeto_codigo, estado_codigo);
CREATE INDEX ix_contracts_fts
  ON seace_contracts USING gin (to_tsvector('spanish', descripcion));

CREATE TABLE contract_documents (
  id BIGSERIAL PRIMARY KEY,
  id_contrato BIGINT NOT NULL REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  id_contrato_archivo BIGINT NOT NULL,
  categoria SMALLINT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT,
  doc_class TEXT CHECK (doc_class IN ('tdr', 'eett', 'bases', 'acta', 'otro')),
  has_text_layer BOOLEAN,
  size_original_bytes BIGINT,
  size_preview_bytes BIGINT,
  sha256_original TEXT NOT NULL,
  sha256_preview TEXT,
  r2_preview_key TEXT,
  seace_download_url TEXT NOT NULL,
  raw_file_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_contrato, id_contrato_archivo)
);

CREATE INDEX ix_documents_contract ON contract_documents (id_contrato);
CREATE INDEX ix_documents_sha256_original ON contract_documents (sha256_original);

CREATE TABLE tdr_extractions (
  id BIGSERIAL PRIMARY KEY,
  contract_document_id BIGINT NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC(10,6),
  raw_extraction_json JSONB NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  quality TEXT NOT NULL DEFAULT 'auto'
    CHECK (quality IN ('auto', 'reviewed', 'corrected', 'failed')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_extraction_current
  ON tdr_extractions (contract_document_id)
  WHERE is_current;

CREATE TABLE requirement_facets (
  id BIGSERIAL PRIMARY KEY,
  id_contrato BIGINT NOT NULL REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  extraction_id BIGINT REFERENCES tdr_extractions(id) ON DELETE SET NULL,
  facet TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  facet_hash TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_facets_contract
  ON requirement_facets (id_contrato)
  WHERE is_current;
CREATE INDEX ix_facets_type
  ON requirement_facets (facet)
  WHERE is_current;
CREATE INDEX ix_facets_details_gin
  ON requirement_facets USING gin (details_json)
  WHERE is_current;

CREATE TABLE contract_filter_index (
  id_contrato BIGINT PRIMARY KEY REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  valor_estimado NUMERIC(14,2),
  plazo_ejecucion_dias INT,
  tipo_pago TEXT,
  penalidad_tope_pct NUMERIC(5,2),
  entregables_count SMALLINT,
  roles_requeridos TEXT[] NOT NULL DEFAULT '{}',
  facets TEXT[] NOT NULL DEFAULT '{}',
  documentos_clave TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_filter_facets ON contract_filter_index USING gin (facets);
CREATE INDEX ix_filter_roles ON contract_filter_index USING gin (roles_requeridos);
CREATE INDEX ix_filter_docs ON contract_filter_index USING gin (documentos_clave);

CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ruc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  identity_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  finance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  experience_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  econ_experience_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  hireable_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ruc)
);

CREATE TABLE business_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cubso_segmentos TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  ubigeos TEXT[] NOT NULL DEFAULT '{}',
  monto_min NUMERIC(14,2),
  monto_max NUMERIC(14,2),
  score_umbral SMALLINT NOT NULL DEFAULT 70 CHECK (score_umbral BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_business_lines_profile ON business_lines (profile_id);
CREATE INDEX ix_business_lines_cubso ON business_lines USING gin (cubso_segmentos);

CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  id_contrato BIGINT NOT NULL REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  business_line_id UUID REFERENCES business_lines(id) ON DELETE SET NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  verdict TEXT NOT NULL CHECK (verdict IN ('verde', 'ambar', 'rojo', 'gris')),
  breakdown_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_state TEXT NOT NULL DEFAULT 'inbox'
    CHECK (user_state IN (
      'inbox',
      'en_evaluacion',
      'interesada',
      'en_preparacion',
      'postulada',
      'ganada',
      'perdida',
      'desierta',
      'en_ejecucion',
      'cobrada',
      'descartada'
    )),
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  monto_ofertado NUMERIC(14,2),
  notas TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, id_contrato)
);

CREATE INDEX ix_matches_feed ON matches (profile_id, verdict, score DESC);
CREATE INDEX ix_matches_funnel ON matches (profile_id, user_state);

CREATE TABLE match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE worker_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  queue_name TEXT NOT NULL DEFAULT 'io'
    CHECK (queue_name IN ('io', 'llm', 'match', 'notify')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'done', 'failed', 'dead')),
  priority SMALLINT NOT NULL DEFAULT 5,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  last_error TEXT,
  dedup_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_jobs_dedup
  ON worker_jobs (dedup_key)
  WHERE status IN ('pending', 'claimed') AND dedup_key IS NOT NULL;
CREATE INDEX ix_jobs_claim ON worker_jobs (status, run_after, priority);
CREATE INDEX ix_jobs_queue_claim ON worker_jobs (queue_name, status, run_after, priority);
CREATE INDEX ix_jobs_type_status ON worker_jobs (job_type, status);

CREATE TABLE pipeline_events (
  id BIGSERIAL PRIMARY KEY,
  id_contrato BIGINT REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  job_id BIGINT REFERENCES worker_jobs(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'ok', 'failed', 'skipped')),
  duration_ms INT,
  error TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_pipeline_events_contract ON pipeline_events (id_contrato, created_at DESC);
CREATE INDEX ix_pipeline_events_stage_status ON pipeline_events (stage, status, created_at DESC);

CREATE TABLE api_contract_checks (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  diff JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_api_contract_checks_latest ON api_contract_checks (endpoint, checked_at DESC);

CREATE TABLE extractor_golden_cases (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  document_storage_key TEXT NOT NULL,
  expected_json JSONB NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_line_id UUID REFERENCES business_lines(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram', 'in_app')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  mode TEXT NOT NULL DEFAULT 'realtime' CHECK (mode IN ('realtime', 'digest')),
  min_verdict TEXT NOT NULL DEFAULT 'ambar' CHECK (min_verdict IN ('verde', 'ambar', 'rojo', 'gris')),
  max_alerts_per_day SMALLINT NOT NULL DEFAULT 5,
  quiet_hours_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_line_id, channel)
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram', 'in_app')),
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'suppressed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_notifications_user_status ON notifications (user_id, status, created_at DESC);
CREATE INDEX ix_notifications_match ON notifications (match_id);
