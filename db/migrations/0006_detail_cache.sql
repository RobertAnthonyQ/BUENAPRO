-- Cache del detalle SEACE: la ingesta lo trae una vez; la web lo refresca
-- bajo demanda al abrir el detalle si esta mas viejo que el TTL.
ALTER TABLE seace_contracts
  ADD COLUMN IF NOT EXISTS detail_fetched_at timestamptz;
