#!/usr/bin/env python3
"""Print the names of templates excluded from pip packages, one per line.

Used by CI to skip these templates in the orphaned-template check.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCAL = {"local", "desktop", "mac", "windows"}

cats = json.loads((ROOT / "templates" / "index.json").read_text(encoding="utf-8"))
for cat in cats:
    for t in cat.get("templates", []):
        dists = t.get("includeOnDistributions", [])
        if (dists and not any(d in LOCAL for d in dists)) or t.get("requiresCustomNodes"):
            print(t["name"])
