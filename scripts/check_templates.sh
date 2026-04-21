#!/bin/bash
# Quick template validation script for maintainers

set -e

echo "🔍 Running template validation checks..."

# Run manifest validation
echo ""
echo "1️⃣ Validating manifest entries..."
python scripts/validate_manifests.py

# Check bundle mapping
echo ""
echo "2️⃣ Checking bundles.json consistency..."
python scripts/ci_version_manager.py --check-only 2>/dev/null || {
    echo "⚠️  Bundle mapping may need update. Consider running sync_bundles.py"
}

echo ""
echo "✅ All checks completed!"
echo ""
echo "💡 If you added/removed templates, make sure to run:"
echo "   python scripts/sync_bundles.py"