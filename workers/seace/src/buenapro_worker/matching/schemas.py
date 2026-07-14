from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AnalysisModel(BaseModel):
    # extra="ignore": el API de Gemini rechaza additionalProperties en
    # response_schema; la estructura ya queda restringida por el schema.
    model_config = ConfigDict(extra="ignore")


CATEGORIAS = Literal[
    "experiencia_economica",
    "experiencia",
    "personal_clave",
    "formacion",
    "licencia",
    "seguro",
    "equipamiento",
    "certificacion",
    "documentacion",
    "identidad",
    "otro",
]


# Los campos clave NO llevan default: en el response_schema de Gemini un campo
# con default queda como opcional y el modelo puede omitirlo (paso con
# veredicto/score/resumen). Requerido = el schema fuerza su generacion.


class RequisitoEvaluado(AnalysisModel):
    requisito: str
    categoria: CATEGORIAS
    estado: Literal["cumple", "cumple_con_accion", "no_cumple", "requiere_revision"]
    critico: bool = False
    gap: str | None = None
    accion: str | None = None


class MatchAnalysisV1(AnalysisModel):
    veredicto: Literal["verde", "ambar", "rojo", "gris"]
    score: int
    resumen: str
    requisitos: list[RequisitoEvaluado]
    acciones_recomendadas: list[str] = Field(default_factory=list)
