from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone

from buenapro_worker.jobs.contract_test import run_contract_test
from buenapro_worker.observability.logging import configure_logging
from buenapro_worker.settings import Settings


def command_contract_test(args: argparse.Namespace, settings: Settings) -> int:
    run_contract_test(settings, anio=args.year)
    return 0


def command_poll_once(args: argparse.Namespace, settings: Settings) -> int:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.poll_search import poll_search
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            stats = poll_search(
                settings,
                repo,
                anio=args.year,
                max_contracts=args.limit,
                segments=_parse_segments(args.segments),
                batch_id=args.batch_id,
                bucket=args.bucket,
            )
    print(stats)
    return 0


def command_schedule(args: argparse.Namespace, settings: Settings) -> int:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.scheduler import enqueue_scheduled_jobs, run_scheduler_forever
    from buenapro_worker.queue.repository import JobRepository

    if not args.once:
        @contextmanager
        def repo_factory():
            with connect(settings) as conn:
                repo = JobRepository(conn)
                with conn.transaction():
                    yield repo

        run_scheduler_forever(settings, repo_factory, anio=args.year)
        return 0

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            enqueued = enqueue_scheduled_jobs(settings, repo, anio=args.year)
    print(enqueued)
    return 0


def command_run(args: argparse.Namespace, settings: Settings) -> int:
    from buenapro_worker.jobs.contract_test import run_contract_test
    from buenapro_worker.jobs.poll_lifecycle import poll_lifecycle
    from buenapro_worker.jobs.poll_search import poll_search
    from buenapro_worker.jobs.process_contract import process_contract
    from buenapro_worker.queue.runner import QueueRunner

    def handle_poll_search(job):
        from buenapro_worker.db.connection import connect
        from buenapro_worker.queue.repository import JobRepository

        with connect(settings) as conn:
            repo = JobRepository(conn)
            with conn.transaction():
                poll_search(
                    settings,
                    repo,
                    anio=int(job.payload.get("anio") or datetime.now(timezone.utc).year),
                    max_contracts=job.payload.get("max_contracts"),
                    segments=_coerce_segments(job.payload.get("segments")),
                    batch_id=job.payload.get("batch_id"),
                    bucket=job.payload.get("bucket"),
                )

    handlers = {
        "poll_search": handle_poll_search,
        "contract_test": lambda job: _handle_contract_test(settings, job),
        "process_contract": lambda job: _handle_process_contract(settings, job),
        "poll_lifecycle": lambda job: _handle_poll_lifecycle(settings, poll_lifecycle),
        "download_file": lambda job: _handle_download_file(settings, job),
        "extract_tdr": lambda job: _handle_extract_tdr(settings, job),
        "derive_summary": lambda job: _handle_derive_summary(settings, job),
        "diff_facets": lambda job: _handle_diff_facets(settings, job),
        "match_contract": lambda job: _handle_match_contract(settings, job),
        "match_profile": lambda job: _handle_match_profile(settings, job),
        "analyze_match": lambda job: _handle_analyze_match(settings, job),
        "send_notification": lambda job: _handle_send_notification(settings, job),
    }
    runner = QueueRunner(settings, handlers)
    runner.run_forever(args.queues)
    return 0


def _handle_process_contract(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.process_contract import process_contract
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            process_contract(
                settings,
                repo,
                id_contrato=int(job.payload["id_contrato"]),
                batch_id=job.payload.get("batch_id"),
                bucket=job.payload.get("bucket"),
                segment=job.payload.get("segment"),
            )


def _handle_contract_test(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect

    result = run_contract_test(
        settings,
        anio=int(job.payload.get("anio") or datetime.now(timezone.utc).year),
    )
    with connect(settings) as conn:
        with conn.transaction():
            conn.execute(
                """
                INSERT INTO api_contract_checks (endpoint, ok, diff)
                VALUES (%s, %s, %s::jsonb)
                """,
                ("seace.search_and_segments", True, "{}"),
            )


def _handle_poll_lifecycle(settings: Settings, poll_lifecycle_func) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            poll_lifecycle_func(settings, repo)


def _handle_download_file(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.download_file import download_file_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            download_file_job(
                settings,
                repo,
                id_contrato=int(job.payload["id_contrato"]),
                id_contrato_archivo=int(job.payload["id_contrato_archivo"]),
                batch_id=job.payload.get("batch_id"),
                bucket=job.payload.get("bucket"),
                segment=job.payload.get("segment"),
            )


def _handle_extract_tdr(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.extract_tdr import extract_tdr_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            extract_tdr_job(
                settings,
                repo,
                id_contrato=int(job.payload["id_contrato"]),
                id_contrato_archivo=int(job.payload["id_contrato_archivo"]),
                batch_id=job.payload.get("batch_id"),
                bucket=job.payload.get("bucket"),
                segment=job.payload.get("segment"),
            )


def _handle_derive_summary(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.derive_summary import derive_summary_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            derive_summary_job(
                repo,
                id_contrato=int(job.payload["id_contrato"]),
                extraction_id=int(job.payload["extraction_id"]),
                batch_id=job.payload.get("batch_id"),
                bucket=job.payload.get("bucket"),
                segment=job.payload.get("segment"),
            )


def _handle_diff_facets(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.diff_facets import diff_facets_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            diff_facets_job(repo, id_contrato=int(job.payload["id_contrato"]))


def _handle_match_contract(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.match import match_contract_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            match_contract_job(repo, id_contrato=int(job.payload["id_contrato"]))


def _handle_match_profile(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.match import match_profile_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            match_profile_job(repo, profile_id=str(job.payload["profile_id"]))


def _handle_analyze_match(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.analyze_match import analyze_match_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            analyze_match_job(
                settings,
                repo,
                id_contrato=int(job.payload["id_contrato"]),
                profile_id=str(job.payload["profile_id"]),
                force=bool(job.payload.get("force")),
            )


def _handle_send_notification(settings: Settings, job) -> None:
    from buenapro_worker.db.connection import connect
    from buenapro_worker.jobs.send_notification import send_notification_job
    from buenapro_worker.queue.repository import JobRepository

    with connect(settings) as conn:
        repo = JobRepository(conn)
        with conn.transaction():
            send_notification_job(settings, repo, notification_id=int(job.payload["notification_id"]))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="buenapro-worker")
    parser.add_argument("--log-level", default="INFO")
    subcommands = parser.add_subparsers(dest="command", required=True)

    run = subcommands.add_parser("run", help="Run worker loop")
    run.add_argument("--queues", nargs="*", default=None)
    run.set_defaults(func=command_run)

    schedule = subcommands.add_parser("schedule", help="Enqueue scheduled jobs once")
    schedule.add_argument("--year", type=int, default=datetime.now(timezone.utc).year)
    schedule.add_argument("--once", action="store_true")
    schedule.set_defaults(func=command_schedule)

    poll_once = subcommands.add_parser("poll-once", help="Poll SEACE search once")
    poll_once.add_argument("--year", type=int, default=datetime.now(timezone.utc).year)
    poll_once.add_argument("--limit", type=int, default=None, help="Max new/changed contracts to enqueue")
    poll_once.add_argument("--segments", default=None, help="Comma-separated CUBSO segments for this run")
    poll_once.add_argument("--batch-id", default=None)
    poll_once.add_argument("--bucket", default=None)
    poll_once.set_defaults(func=command_poll_once)

    contract_test = subcommands.add_parser("contract-test", help="Validate SEACE endpoint shapes")
    contract_test.add_argument("--year", type=int, default=datetime.now(timezone.utc).year)
    contract_test.set_defaults(func=command_contract_test)

    return parser


def _parse_segments(value: str | None) -> list[int] | None:
    if not value:
        return None
    return [int(item.strip()) for item in value.split(",") if item.strip()]


def _coerce_segments(value: object) -> list[int] | None:
    if value is None:
        return None
    if isinstance(value, list):
        return [int(item) for item in value]
    if isinstance(value, str):
        return _parse_segments(value)
    return None


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    configure_logging(args.log_level)
    settings = Settings()
    return args.func(args, settings)


if __name__ == "__main__":
    raise SystemExit(main())
