#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
src="$(cd "$(dirname "$0")" && pwd)"
for f in validate-manifests.yml version-check.yml build-test.yml publish.yml; do
  cp "$src/$f" "$root/.github/workflows/$f"
  echo "installed $f"
done
echo "Done. Review with: git diff -- .github/workflows"
