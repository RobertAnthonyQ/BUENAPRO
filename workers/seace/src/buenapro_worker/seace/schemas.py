from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SeaceModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class SearchItem(SeaceModel):
    id_contrato: int = Field(alias="idContrato")
    codigo: str = Field(alias="desContratacion")
    objeto_codigo: int = Field(alias="idObjetoContrato")
    objeto_nombre: str | None = Field(default=None, alias="nomObjetoContrato")
    descripcion: str = Field(alias="desObjetoContrato")
    estado_codigo: int = Field(alias="idEstadoContrato")
    estado_nombre: str | None = Field(default=None, alias="nomEstadoContrato")
    entidad_nombre: str | None = Field(default=None, alias="nomEntidad")
    fec_publica: str | None = Field(default=None, alias="fecPublica")
    fec_ini_cotizacion: str | None = Field(default=None, alias="fecIniCotizacion")
    fec_fin_cotizacion: str | None = Field(default=None, alias="fecFinCotizacion")
    cotizar: bool | None = None


class Pageable(SeaceModel):
    page_number: int = Field(alias="pageNumber")
    page_size: int = Field(alias="pageSize")
    total_elements: int = Field(alias="totalElements")


class SearchResponse(SeaceModel):
    data: list[SearchItem]
    pageable: Pageable


class FileItem(SeaceModel):
    id_contrato_archivo: int | None = Field(default=None, alias="idContratoArchivo")
    nombre_archivo: str | None = Field(default=None, alias="nomArchivo")


class ContractDetail(SeaceModel):
    id_contrato: int | None = Field(default=None, alias="idContrato")


def require_keys(payload: dict[str, Any], keys: set[str]) -> None:
    missing = sorted(key for key in keys if key not in payload)
    if missing:
        raise ValueError(f"Missing SEACE keys: {', '.join(missing)}")
