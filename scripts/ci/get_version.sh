#!/bin/bash
# Extracts version from pyproject.toml files with consistent parsing
# Usage: ./scripts/ci/get_version.sh <pyproject.toml-path>
# Returns: version string

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <pyproject.toml-path>" >&2
  exit 1
fi

TOML_FILE="$1"

if [[ ! -f "$TOML_FILE" ]]; then
  echo "Error: File '$TOML_FILE' not found" >&2
  exit 1
fi

# Use consistent version extraction pattern
grep -E '^\s*version\s*=' "$TOML_FILE" | cut -d'"' -f2