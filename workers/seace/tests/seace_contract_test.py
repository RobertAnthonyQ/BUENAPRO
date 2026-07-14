from __future__ import annotations

from buenapro_worker.seace.client import SeaceClient
from buenapro_worker.settings import Settings


def main() -> int:
    settings = Settings()
    with SeaceClient(settings) as client:
        search = client.search_contracts(
            anio=2026,
            estado=settings.primary_estado_contrato,
            objeto=settings.primary_codigo_objeto,
            segmento=81,
            page=1,
            page_size=1,
        )
        assert search.data, "search must return at least one item for segment 81"
        item = search.data[0]
        assert item.id_contrato
        assert item.codigo
        assert item.descripcion

        detail = client.contract_detail(item.id_contrato)
        assert "uitContratoCompletoProjection" in detail
        assert "uitContratoEtapaProjectionList" in detail
        assert "uitContratoItemProjectionList" in detail

        files = client.list_files(item.id_contrato, category=1)
        assert isinstance(files, list)
        assert files, "contract must have category 1 files"
        file_id = files[0]["idContratoArchivo"]
        assert file_id

        content = client.download_file(int(file_id))
        assert content.startswith(b"%PDF"), "downloaded file must be a PDF"

    print(f"seace contract ok: id_contrato={item.id_contrato} id_archivo={file_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
