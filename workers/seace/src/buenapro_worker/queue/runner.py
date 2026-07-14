from __future__ import annotations

import logging
import time
from collections.abc import Callable

from buenapro_worker.db.connection import connect
from buenapro_worker.observability.events import record_pipeline_event
from buenapro_worker.queue.repository import Job, JobRepository
from buenapro_worker.settings import Settings


Handler = Callable[[Job], None]

logger = logging.getLogger(__name__)


class QueueRunner:
    def __init__(self, settings: Settings, handlers: dict[str, Handler]) -> None:
        self.settings = settings
        self.handlers = handlers

    def run_once(self, queues: list[str] | None = None) -> bool:
        with connect(self.settings) as conn:
            repo = JobRepository(conn)
            with conn.transaction():
                job = repo.claim_next(self.settings.worker_id, queues)

            if job is None:
                return False

            handler = self.handlers.get(job.job_type)
            if handler is None:
                with conn.transaction():
                    repo.dead(job.id, f"No handler registered for job_type={job.job_type}")
                return True

            started = time.monotonic()
            with conn.transaction():
                record_pipeline_event(
                    conn,
                    stage=job.job_type,
                    status="started",
                    id_contrato=_id_contrato(job),
                    job_id=job.id,
                    metadata={"queue": job.queue_name},
                )

            try:
                handler(job)
            except Exception as exc:
                duration_ms = round((time.monotonic() - started) * 1000)
                logger.exception(
                    "job_failed",
                    extra={"job_id": job.id, "job_type": job.job_type, "attempts": job.attempts},
                )
                with conn.transaction():
                    record_pipeline_event(
                        conn,
                        stage=job.job_type,
                        status="failed",
                        id_contrato=_id_contrato(job),
                        job_id=job.id,
                        duration_ms=duration_ms,
                        error=str(exc),
                        metadata={"queue": job.queue_name, "attempts": job.attempts},
                    )
                    repo.fail(job.id, str(exc), job.attempts)
                return True

            duration_ms = round((time.monotonic() - started) * 1000)
            with conn.transaction():
                record_pipeline_event(
                    conn,
                    stage=job.job_type,
                    status="ok",
                    id_contrato=_id_contrato(job),
                    job_id=job.id,
                    duration_ms=duration_ms,
                    metadata={"queue": job.queue_name, "attempts": job.attempts},
                )
                repo.complete(job.id)
            logger.info("job_completed", extra={"job_id": job.id, "job_type": job.job_type})
            return True

    def run_forever(self, queues: list[str] | None = None, idle_seconds: float = 2.0) -> None:
        while True:
            did_work = self.run_once(queues)
            if not did_work:
                time.sleep(idle_seconds)


def _id_contrato(job: Job) -> int | None:
    value = job.payload.get("id_contrato")
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
