CREATE TABLE seace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username_secret TEXT NOT NULL,
  password_secret TEXT NOT NULL,
  session_secret TEXT,
  key_version SMALLINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'expired', 'invalid', 'requires_2fa', 'disconnected')),
  session_expires_at TIMESTAMPTZ,
  last_authenticated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seace_connection_events (
  id BIGSERIAL PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES seace_connections(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_seace_connection_events_connection
  ON seace_connection_events (connection_id, created_at DESC);
