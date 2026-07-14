from __future__ import annotations

import hashlib


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def detect_mime(data: bytes) -> str:
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return "application/octet-stream"


def classify_document(filename: str, mime: str) -> str:
    name = filename.lower()
    if mime == "application/pdf" and any(token in name for token in ("tdr", "rtm", "requer", "terminos", "términos")):
        return "tdr"
    if "eett" in name or "especificacion" in name or "especificación" in name:
        return "eett"
    if "base" in name:
        return "bases"
    if "acta" in name:
        return "acta"
    return "otro"
