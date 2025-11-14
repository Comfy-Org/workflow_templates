#!/usr/bin/env bash
set -euo pipefail

python3 scripts/sync_bundles.py

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip build pytest twine ruff aiohttp

rm -rf dist
mkdir dist

for pkg in core media_api media_video media_image media_other meta; do
  python -m build --outdir dist "packages/${pkg}"
done

ruff check scripts/sync_bundles.py packages/core packages/meta

pytest packages/core/tests

twine check dist/*
