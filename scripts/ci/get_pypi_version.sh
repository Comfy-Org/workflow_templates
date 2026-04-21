#!/bin/bash
# Fetches package version from PyPI with robust error handling
# Usage: ./scripts/ci/get_pypi_version.sh <package-name>
# Returns: version string or "0.0.0" if not found/error

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <package-name>" >&2
  exit 1
fi

PACKAGE_NAME="$1"

# Robust PyPI version fetch with timeout and fallback
pypi_response=$(curl -s --max-time 10 --retry 2 "https://pypi.org/pypi/$PACKAGE_NAME/json" 2>/dev/null || echo "")

if [[ -n "$pypi_response" ]]; then
  version=$(echo "$pypi_response" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['info']['version'])" 2>/dev/null || echo "0.0.0")
  echo "$version"
else
  echo "0.0.0"
fi