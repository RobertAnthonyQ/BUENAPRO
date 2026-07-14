# Extractor golden set

Five real SEACE TDRs and reviewed baseline JSONs from the initial sandbox analysis.

Run:

```bash
.venv/bin/python workers/seace/tests/run_golden.py
```

The golden test compares critical fields:

- penalties
- economic experience
- key personnel roles
- payment form

It does not call Gemini by default; it validates that the expected JSONs keep the contract needed by normalization and matching.
