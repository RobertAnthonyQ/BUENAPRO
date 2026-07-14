from __future__ import annotations

import logging

from buenapro_worker.queue.repository import JobRepository


logger = logging.getLogger(__name__)

# El matching determinista fue reemplazado por el analisis LLM bajo demanda
# (jobs/analyze_match.py). Estos jobs se mantienen como puntos de entrada
# (la web y el lifecycle los encolan) pero ahora solo re-analizan matches
# existentes; el guard de hashes en analyze_match evita trabajo repetido.


def match_contract_job(repo: JobRepository, *, id_contrato: int) -> int:
    rows = repo.conn.execute(
        "SELECT profile_id FROM matches WHERE id_contrato = %s",
        (id_contrato,),
    ).fetchall()
    for row in rows:
        _enqueue_analysis(repo, id_contrato=id_contrato, profile_id=str(row["profile_id"]))
    logger.info("match_contract_delegated", extra={"id_contrato": id_contrato, "profiles": len(rows)})
    return len(rows)


def match_profile_job(repo: JobRepository, *, profile_id: str) -> int:
    rows = repo.conn.execute(
        "SELECT id_contrato FROM matches WHERE profile_id = %s",
        (profile_id,),
    ).fetchall()
    for row in rows:
        _enqueue_analysis(repo, id_contrato=int(row["id_contrato"]), profile_id=profile_id)
    logger.info("match_profile_delegated", extra={"profile_id": profile_id, "contracts": len(rows)})
    return len(rows)


def _enqueue_analysis(repo: JobRepository, *, id_contrato: int, profile_id: str) -> None:
    repo.enqueue(
        "analyze_match",
        {"id_contrato": id_contrato, "profile_id": profile_id},
        queue_name="llm",
        dedup_key=f"analyze_match:{profile_id}:{id_contrato}",
        priority=4,
    )
