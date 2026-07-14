-- Memoria persistente del copiloto por postulacion.
-- Las acciones del agente siempre nacen como propuestas pendientes y nunca
-- representan un envio oficial a SEACE.

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id_contrato BIGINT NOT NULL REFERENCES seace_contracts(id_contrato) ON DELETE CASCADE,
  match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
  application_id UUID REFERENCES application_drafts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Nueva conversación' CHECK (length(title) BETWEEN 1 AND 120),
  summary TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL CHECK (length(content) > 0),
  citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  model TEXT,
  usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_change_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  changes_json JSONB NOT NULL CHECK (jsonb_typeof(changes_json) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'rejected')),
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'pending' AND confirmed_at IS NULL AND rejected_at IS NULL) OR
    (status = 'applied' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL AND rejected_at IS NULL) OR
    (status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND confirmed_at IS NULL)
  )
);

CREATE INDEX ix_chat_sessions_tenant_match
  ON chat_sessions (tenant_id, match_id, updated_at DESC);
CREATE INDEX ix_chat_sessions_tenant_contract
  ON chat_sessions (tenant_id, id_contrato, updated_at DESC);
CREATE INDEX ix_chat_messages_session
  ON chat_messages (session_id, created_at, id);
CREATE INDEX ix_agent_runs_session
  ON agent_runs (session_id, created_at DESC);
CREATE INDEX ix_agent_change_sets_pending
  ON agent_change_sets (run_id, status, created_at DESC);
