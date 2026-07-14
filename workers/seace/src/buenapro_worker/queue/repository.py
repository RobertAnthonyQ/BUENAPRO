from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg


@dataclass(frozen=True)
class Job:
    id: int
    job_type: str
    queue_name: str
    payload: dict[str, Any]
    attempts: int


class JobRepository:
    def __init__(self, conn: psycopg.Connection) -> None:
        self.conn = conn

    def enqueue(
        self,
        job_type: str,
        payload: dict[str, Any] | None = None,
        *,
        queue_name: str = "io",
        dedup_key: str | None = None,
        priority: int = 5,
        run_after: datetime | None = None,
        max_attempts: int = 5,
    ) -> int | None:
        row = self.conn.execute(
            """
            INSERT INTO worker_jobs (
              job_type, queue_name, payload, dedup_key, priority, run_after, max_attempts
            )
            VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            (
                job_type,
                queue_name,
                json.dumps(payload or {}, ensure_ascii=False),
                dedup_key,
                priority,
                run_after or datetime.now(timezone.utc),
                max_attempts,
            ),
        ).fetchone()
        return None if row is None else int(row["id"])

    def claim_next(self, worker_id: str, queues: list[str] | None = None) -> Job | None:
        row = self.conn.execute(
            """
            UPDATE worker_jobs
            SET status = 'claimed',
                claimed_by = %s,
                claimed_at = now(),
                attempts = attempts + 1
            WHERE id = (
              SELECT id
              FROM worker_jobs
              WHERE status = 'pending'
                AND run_after <= now()
                AND (%s::text[] IS NULL OR queue_name = ANY(%s::text[]))
              ORDER BY priority ASC, run_after ASC, id ASC
              FOR UPDATE SKIP LOCKED
              LIMIT 1
            )
            RETURNING id, job_type, queue_name, payload, attempts
            """,
            (worker_id, queues, queues),
        ).fetchone()

        if row is None:
            return None
        return Job(
            id=int(row["id"]),
            job_type=str(row["job_type"]),
            queue_name=str(row["queue_name"]),
            payload=dict(row["payload"]),
            attempts=int(row["attempts"]),
        )

    def complete(self, job_id: int) -> None:
        self.conn.execute(
            """
            UPDATE worker_jobs
            SET status = 'done', finished_at = now(), last_error = NULL
            WHERE id = %s
            """,
            (job_id,),
        )

    def fail(self, job_id: int, error: str, attempts: int, max_attempts: int = 5) -> None:
        if attempts >= max_attempts:
            self.dead(job_id, error)
            return

        delay_seconds = (2 ** max(attempts - 1, 0)) * 30 + random.randint(0, 30)
        run_after = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)

        self.conn.execute(
            """
            UPDATE worker_jobs
            SET status = 'pending',
                run_after = %s,
                claimed_by = NULL,
                claimed_at = NULL,
                last_error = %s
            WHERE id = %s
            """,
            (run_after, error[:4000], job_id),
        )

    def dead(self, job_id: int, error: str) -> None:
        self.conn.execute(
            """
            UPDATE worker_jobs
            SET status = 'dead',
                finished_at = now(),
                last_error = %s
            WHERE id = %s
            """,
            (error[:4000], job_id),
        )
