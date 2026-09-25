#!/usr/bin/env python3
"""Validate the generated catalog independently of the Excel importer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from catalog_core import validate_catalog


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "data" / "generated" / "catalog.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    errors, warnings = validate_catalog(catalog)
    if errors:
        print(json.dumps({"valid": False, "errors": errors, "warnings": warnings}, ensure_ascii=False, indent=2))
        raise SystemExit(1)
    print(json.dumps({
        "valid": True,
        "schemaVersion": catalog.get("schemaVersion"),
        "subjects": len(catalog.get("subjects", [])),
        "topics": len(catalog.get("topics", [])),
        "activities": len(catalog.get("activities", [])),
        "warnings": len(warnings),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
