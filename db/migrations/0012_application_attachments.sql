-- Archivos agregados por el proveedor a un borrador de postulacion.
-- Para el MVP se guardan en PostgreSQL; no representan un envio oficial a SEACE.

CREATE TABLE application_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES application_drafts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
  mime_type TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  content BYTEA NOT NULL CHECK (octet_length(content) = size_bytes),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_application_attachments_application
  ON application_attachments (application_id, created_at DESC);
