from __future__ import annotations

import logging

from buenapro_worker.queue.repository import JobRepository


logger = logging.getLogger(__name__)


def diff_facets_job(repo: JobRepository, *, id_contrato: int) -> int:
    row = repo.conn.execute(
        """
        SELECT count(*) AS total
        FROM requirement_facets
        WHERE id_contrato = %s AND is_current = true
        """,
        (id_contrato,),
    ).fetchone()
    total = int(row["total"] if row else 0)
    if total:
        matches = repo.conn.execute(
            "SELECT profile_id FROM matches WHERE id_contrato = %s",
            (id_contrato,),
        ).fetchall()
        for match in matches:
            repo.enqueue(
                "analyze_match",
                {"id_contrato": id_contrato, "profile_id": str(match["profile_id"])},
                queue_name="llm",
                dedup_key=f"analyze_match:{match['profile_id']}:{id_contrato}",
                priority=4,
            )
    logger.info("diff_facets_done", extra={"id_contrato": id_contrato, "facets": total})
    return total
