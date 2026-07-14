from __future__ import annotations

import os
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "db" / "migrations"


def database_url() -> str:
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise SystemExit("DATABASE_URL is required")
    return value


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def ensure_migrations_table(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def applied_versions(conn: psycopg.Connection) -> set[str]:
    rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
    return {row[0] for row in rows}


def apply_migration(conn: psycopg.Connection, path: Path) -> None:
    version = path.name
    sql = path.read_text(encoding="utf-8")
    with conn.transaction():
        conn.execute(sql)
        conn.execute(
            "INSERT INTO schema_migrations (version) VALUES (%s) ON CONFLICT DO NOTHING",
            (version,),
        )
    print(f"applied {version}")


def main() -> None:
    with psycopg.connect(database_url()) as conn:
        conn.execute("SET TIME ZONE 'UTC'")
        ensure_migrations_table(conn)
        applied = applied_versions(conn)
        pending = [path for path in migration_files() if path.name not in applied]

        if not pending:
            print("database is up to date")
            return

        for path in pending:
            apply_migration(conn, path)


if __name__ == "__main__":
    main()
