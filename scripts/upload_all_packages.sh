#!/usr/bin/env bash
set -euo pipefail

PACKAGES=(core media_api media_video media_image media_other)

for pkg in "${PACKAGES[@]}"; do
  twine upload dist/comfyui_workflow_templates_${pkg}-*.whl dist/comfyui_workflow_templates_${pkg}-*.tar.gz
  echo "Uploaded comfyui_workflow_templates_${pkg}"
done

twine upload dist/comfyui_workflow_templates-*.whl dist/comfyui_workflow_templates-*.tar.gz
