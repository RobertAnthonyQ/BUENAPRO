from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://prod6.seace.gob.pe/v1/s8uit-services"


@dataclass(frozen=True)
class Segment:
    codigo: str
    anio: int
    nombre: str
    raw_json: dict


def fetch_segments(base_url: str, year: int) -> list[Segment]:
    query = urlencode({"anio": year})
    url = f"{base_url}/buscadorpublico/contrataciones/listar-segmentos-cubso?{query}"
    request = Request(url, headers={"User-Agent": "BuenaPro/0.1"})

    with urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return [
        Segment(
            codigo=str(item["clave"]),
            anio=year,
            nombre=str(item["valorCadena"]).strip(),
            raw_json=item,
        )
        for item in payload
    ]


def upsert_segments(database_url: str, segments: list[Segment]) -> None:
    import psycopg

    sql = """
    INSERT INTO cat_cubso_segmentos (codigo, anio, nombre, raw_json, synced_at)
    VALUES (%s, %s, %s, %s::jsonb, now())
    ON CONFLICT (codigo, anio)
    DO UPDATE SET
      nombre = EXCLUDED.nombre,
      raw_json = EXCLUDED.raw_json,
      synced_at = now()
    """

    with psycopg.connect(database_url) as conn:
        with conn.transaction():
            for segment in segments:
                conn.execute(
                    sql,
                    (
                        segment.codigo,
                        segment.anio,
                        segment.nombre,
                        json.dumps(segment.raw_json, ensure_ascii=False),
                    ),
                )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync CUBSO segments from SEACE")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--base-url", default=os.environ.get("SEACE_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    segments = fetch_segments(args.base_url, args.year)

    if args.dry_run:
        for segment in segments:
            print(f"{segment.codigo}: {segment.nombre}")
        print(f"total={len(segments)}")
        return 0

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required unless --dry-run is used")

    upsert_segments(database_url, segments)
    print(f"synced {len(segments)} CUBSO segments for {args.year}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
