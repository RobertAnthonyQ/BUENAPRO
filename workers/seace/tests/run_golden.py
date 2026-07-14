from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
GOLDEN = ROOT / "golden"
CRITICAL_FIELDS = ("penalties", "economic_experience", "roles", "payment")


def load_cases() -> list[dict[str, str]]:
    return json.loads((GOLDEN / "manifest.json").read_text(encoding="utf-8"))


def critical_projection(payload: dict[str, Any]) -> dict[str, Any]:
    requirements = payload.get("requirements") or {}
    personnel = requirements.get("key_personnel") or []
    provider = requirements.get("provider") or []
    economic = requirements.get("economic_experience") or [
        item for item in provider if isinstance(item, dict) and item.get("tipo") == "economic_experience"
    ]
    return {
        "penalties": payload.get("penalties") or [],
        "economic_experience": economic,
        "roles": [_role(item) for item in personnel if _role(item)],
        "payment": payload.get("payment") or {},
    }


def _role(item: Any) -> str | None:
    if isinstance(item, dict):
        value = item.get("role") or item.get("rol") or item.get("cargo") or item.get("label") or item.get("name")
        return str(value) if value else None
    return str(item) if item else None


def validate_case(case: dict[str, str]) -> list[str]:
    errors: list[str] = []
    pdf = GOLDEN / case["pdf"]
    expected = GOLDEN / case["expected"]

    if not pdf.exists():
        errors.append(f"missing pdf: {pdf}")
    if not expected.exists():
        errors.append(f"missing expected: {expected}")
        return errors

    payload = json.loads(expected.read_text(encoding="utf-8"))
    projection = critical_projection(payload)
    for field in CRITICAL_FIELDS:
        if field not in projection:
            errors.append(f"{case['name']}: missing critical field {field}")

    if not isinstance(projection["penalties"], list):
        errors.append(f"{case['name']}: penalties must be a list")
    if not isinstance(projection["roles"], list):
        errors.append(f"{case['name']}: roles must be a list")
    if not isinstance(projection["payment"], dict):
        errors.append(f"{case['name']}: payment must be an object")

    return errors


def main() -> int:
    errors: list[str] = []
    cases = load_cases()
    if len(cases) != 5:
        errors.append(f"expected 5 golden cases, found {len(cases)}")

    for case in cases:
        errors.extend(validate_case(case))

    if errors:
        for error in errors:
            print(f"FAIL {error}")
        return 1

    print(f"golden ok: {len(cases)} cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
