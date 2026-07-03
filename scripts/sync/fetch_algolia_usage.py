#!/usr/bin/env python3
"""
Fetch per-template popularity (``run_clicks``) from the Algolia
``templates_index`` and write it to ``temp/usage.csv`` for ``sync_data.py`` to
fold into ``index.json``.

The Algolia index is rebuilt daily by the data platform from real PostHog
run-click usage (one record per template, joined by ``slug``). This script is
the build-time bridge: it reuses the existing usage.csv pipeline rather than
writing ``index.json`` directly, so ranking data flows through the same path as
the manual CSV it replaces.

Credentials are the public, search-only Algolia key (safe to commit), read from
``ALGOLIA_APP_ID`` / ``ALGOLIA_API_KEY`` (unprefixed — the site uses ``PUBLIC_``
prefixed names for Vite; this Python script does not).
"""

import argparse
import csv
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_APP_ID = "4E0RO38HS8"
DEFAULT_INDEX = "templates_index"
# Algolia's per-request cap; the index fits one page today but we paginate.
HITS_PER_PAGE = 1000
# Retry the scheduled fetch through a transient hiccup rather than skip a whole cycle.
MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 2

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def _algolia_page(app_id: str, api_key: str, index: str, page: int) -> dict:
    body = json.dumps(
        {
            "query": "",
            "hitsPerPage": HITS_PER_PAGE,
            "page": page,
            "attributesToRetrieve": ["slug", "run_clicks"],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"https://{app_id}-dsn.algolia.net/1/indexes/{index}/query",
        data=body,
        headers={
            "X-Algolia-Application-Id": app_id,
            "X-Algolia-API-Key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.URLError as error:
            if attempt == MAX_ATTEMPTS:
                raise
            logger.warning(f"Algolia request failed ({error}); retry {attempt}/{MAX_ATTEMPTS - 1}")
            time.sleep(BACKOFF_SECONDS * attempt)


def fetch_run_clicks(app_id: str, api_key: str, index: str) -> dict:
    """Return ``{slug: run_clicks}`` across every page of the index."""
    run_clicks = {}
    page = 0
    nb_pages = 1
    while page < nb_pages:
        result = _algolia_page(app_id, api_key, index, page)
        for hit in result.get("hits", []):
            slug = hit.get("slug")
            if not slug:
                continue
            try:
                run_clicks[slug] = int(hit.get("run_clicks", 0) or 0)
            except (TypeError, ValueError):
                run_clicks[slug] = 0  # non-numeric run_clicks → treat as 0, don't abort the run
        nb_pages = result.get("nbPages", 1)
        page += 1
    return run_clicks


def write_usage_csv(run_clicks: dict, csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Metric", "workflow_name", "usage_count"])
        for slug, clicks in sorted(run_clicks.items()):
            writer.writerow(["run_clicks", slug, clicks])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Algolia run_clicks into temp/usage.csv"
    )
    parser.add_argument(
        "--templates-dir",
        default="templates",
        help="Templates directory; usage.csv is written to its sibling temp/ dir",
    )
    args = parser.parse_args()

    app_id = os.environ.get("ALGOLIA_APP_ID", DEFAULT_APP_ID)
    api_key = os.environ.get("ALGOLIA_API_KEY")
    index = os.environ.get("ALGOLIA_TEMPLATES_INDEX", DEFAULT_INDEX)

    if not api_key:
        logger.error("ALGOLIA_API_KEY is not set; cannot fetch usage data")
        return 1

    try:
        run_clicks = fetch_run_clicks(app_id, api_key, index)
    except Exception as error:
        logger.error(f"Failed to fetch Algolia usage: {error}")
        return 1

    if not run_clicks:
        logger.error("Algolia returned no records; leaving usage.csv untouched")
        return 1

    csv_path = Path(args.templates_dir).parent / "temp" / "usage.csv"
    write_usage_csv(run_clicks, csv_path)
    logger.info(f"Wrote run_clicks for {len(run_clicks)} templates to {csv_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
