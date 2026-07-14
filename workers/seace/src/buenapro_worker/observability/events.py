from __future__ import annotations

import json
from typing import Any

import psycopg


def record_pipeline_event(
    conn: psycopg.Connection,
    *,
    stage: str,
    status: str,
    id_contrato: int | None = None,
    job_id: int | None = None,
    duration_ms: int | None = None,
    error: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO pipeline_events (
          id_contrato, job_id, stage, status, duration_ms, error, metadata_json
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
        """,
        (
            id_contrato,
            job_id,
            stage,
            status,
            duration_ms,
            error[:4000] if error else None,
            json.dumps(metadata or {}, ensure_ascii=False),
        ),
    )


def poll_search_is_stale(conn: psycopg.Connection, *, minutes: int = 90) -> bool:
    row = conn.execute(
        """
        SELECT max(created_at) AS last_ok
        FROM pipeline_events
        WHERE stage = 'poll_search' AND status = 'ok'
        """
    ).fetchone()
    if row is None or row["last_ok"] is None:
        return True
    stale = conn.execute(
        "SELECT (%s < now() - (%s || ' minutes')::interval) AS stale",
        (row["last_ok"], minutes),
    ).fetchone()
    return bool(stale["stale"])
