from __future__ import annotations

import logging

from buenapro_worker.jobs.process_contract import process_contract
from buenapro_worker.queue.repository import JobRepository
from buenapro_worker.settings import Settings


logger = logging.getLogger(__name__)


def active_contract_ids(repo: JobRepository, limit: int = 200) -> list[int]:
    rows = repo.conn.execute(
        """
        SELECT id_contrato
        FROM seace_contracts
        WHERE estado_codigo IN (2, 3)
           OR pipeline_state NOT IN ('closed', 'awarded', 'failed')
        ORDER BY COALESCE(fec_fin_cotizacion, updated_at) ASC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [int(row["id_contrato"]) for row in rows]


def poll_lifecycle(settings: Settings, repo: JobRepository, *, limit: int = 200) -> dict[str, int]:
    stats = {"checked": 0, "changed": 0}

    for id_contrato in active_contract_ids(repo, limit=limit):
        stats["checked"] += 1
        result = process_contract(settings, repo, id_contrato)
        if result["detail_changed"] or result["files_changed"]:
            stats["changed"] += 1
            repo.enqueue(
                "diff_facets",
                {"id_contrato": id_contrato},
                queue_name="match",
                dedup_key=f"diff_facets:{id_contrato}",
                priority=3,
            )

    logger.info("poll_lifecycle_done", extra=stats)
    return stats
