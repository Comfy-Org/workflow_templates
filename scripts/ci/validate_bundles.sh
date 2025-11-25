#!/bin/bash
# Validates that all templates are assigned to bundles in bundles.json
# Used by both version-check and publish workflows
# Usage: ./scripts/ci/validate_bundles.sh

set -euo pipefail

# Ensure we're in repo root (where bundles.json lives)
if [[ ! -f "bundles.json" ]]; then
  echo "❌ Error: bundles.json not found. Run from repository root."
  exit 1
fi

if [[ ! -d "templates" ]]; then
  echo "❌ Error: templates/ directory not found. Run from repository root."
  exit 1
fi

echo "🔍 Validating bundle assignments..."

# Check if any .json files in templates/ are missing from bundles.json
MISSING_TEMPLATES=""
for template_file in templates/*.json; do
  # Handle case where no .json files exist
  if [[ ! -e "$template_file" ]]; then
    echo "ℹ️ No template files found"
    exit 0
  fi
  
  template_name=$(basename "$template_file" .json)
  # Use jq for precise JSON parsing to avoid substring false matches  
  if ! jq -e --arg template "$template_name" 'to_entries[] | .value[] | select(. == $template)' bundles.json >/dev/null 2>&1; then
    MISSING_TEMPLATES="$MISSING_TEMPLATES $template_name"
  fi
done

if [[ -n "$MISSING_TEMPLATES" ]]; then
  echo "❌ Templates not assigned to bundles:$MISSING_TEMPLATES"
  echo ""
  echo "💡 Add these templates to the appropriate bundle in bundles.json:"
  echo "   - media-api: for API-based templates"
  echo "   - media-video: for video generation templates" 
  echo "   - media-image: for image generation templates"
  echo "   - media-other: for other types of templates"
  exit 1
fi

echo "✅ All templates properly assigned to bundles"