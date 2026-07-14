# BuenaPro DB

## Migration tool

Use plain SQL migrations in `db/migrations`.

Rationale:

- PostgreSQL is the source of truth.
- The worker is Python and the web is Next.js, so SQL keeps the schema neutral.
- The first MVP needs stable tables before choosing an ORM.

## Running migrations

```bash
export DATABASE_URL=postgresql://buenapro:buenapro@localhost:5432/buenapro
python3 scripts/migrate.py
```

The runner records applied files in `schema_migrations`.

## Timestamp convention

All database timestamps use `TIMESTAMPTZ` and are stored in UTC.

SEACE dates must be parsed as `America/Lima`, converted to UTC before insert, and rendered back to `America/Lima` in the web UI.

## Initial seeds

The initial migration seeds stable SEACE catalogs:

- objects: Bien, Servicio, Obra, Consultoria de Obra
- states: Vigente, En Evaluacion, Culminado

CUBSO segments are synced per year from SEACE. MVP enabled segments for tecnologia, transporte and legal must be selected after validating the 2026 catalog.

## Syncing CUBSO segments

Preview the current SEACE catalog:

```bash
python3 scripts/sync_cubso_segments.py --year 2026 --dry-run
```

Persist it to PostgreSQL:

```bash
export DATABASE_URL=postgresql://buenapro:buenapro@localhost:5432/buenapro
python3 scripts/sync_cubso_segments.py --year 2026
```

The initial MVP segment seed enables:

- tecnologia: `43`, `81`
- transporte: `78`
- legal: `80`
