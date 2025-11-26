# Publishing the Workflow Templates Packages

This repository now produces six wheels:

- `comfyui-workflow-templates-core`
- `comfyui-workflow-templates-media-api`
- `comfyui-workflow-templates-media-video`
- `comfyui-workflow-templates-media-image`
- `comfyui-workflow-templates-media-other`
- `comfyui-workflow-templates` (meta package that depends on all bundles)

Publishing a package on PyPI automatically creates the project if it does not already exist. Follow this playbook each time you cut a release.

## Prerequisites

1. Install Python 3.12+ and `pipx` (recommended) or work inside a virtual environment.
2. Install the latest `build` and `twine`:
   ```bash
   pipx install build
   pipx install twine
   ```
   or
   ```bash
   python -m pip install --upgrade build twine
   ```
3. Have API tokens for **TestPyPI** and **PyPI** with the necessary permissions under the Comfy org (`project:comfyui-workflow-templates-*`). Save them somewhere secure—never commit them.
4. Optional: if you want GitHub Actions to publish automatically, set up PyPI “Trusted Publishers” for each project, then skip the manual `twine upload` step.

## 1. Build Wheels Locally

```bash
git checkout refactor/package-of-packages
git pull

./scripts/bump_versions.py --dry-run   # inspect what will be bumped
./scripts/bump_versions.py             # apply version bumps
./run_full_validation.sh
```

This script regenerates the manifest, rebuilds all six wheels into `./dist/`, runs lint/tests, and performs `twine check`.

## 2. Dry Run on TestPyPI

1. Export the TestPyPI token (or pass with `-u __token__ -p pypi-...`):
   ```bash
    export TWINE_REPOSITORY=testpypi
    export TWINE_USERNAME="__token__"
    export TWINE_PASSWORD="pypi-<testpypi-token>"
   ```
2. Upload each wheel/sdist pair. A simple loop:
   ```bash
    for pkg in core media_api media_video media_image media_other meta; do
      twine upload dist/comfyui_workflow_templates_${pkg}-*.whl dist/comfyui_workflow_templates_${pkg}-*.tar.gz
    done
   ```
   The meta package uses `_` in the wheel file name. Adjust accordingly:
   ```bash
    twine upload dist/comfyui_workflow_templates-*.whl dist/comfyui_workflow_templates-*.tar.gz
   ```
3. Verify on https://test.pypi.org/project/comfyui-workflow-templates-core/ (repeat for each project). Check the simple index for files.
4. Test installation from TestPyPI:
   ```bash
    python -m venv /tmp/testenv && source /tmp/testenv/bin/activate
    python -m pip install --upgrade pip
    python -m pip install --index-url https://test.pypi.org/simple --extra-index-url https://pypi.org/simple comfyui-workflow-templates
   ```
   Confirm `python -c "import comfyui_workflow_templates_core; print(len(list(comfyui_workflow_templates_core.iter_templates())))"` works and assets resolve.

## 3. Publish to PyPI

1. Switch to production token:
   ```bash
    export TWINE_REPOSITORY=pypi
    export TWINE_USERNAME="__token__"
    export TWINE_PASSWORD="pypi-<production-token>"
   ```
2. Repeat the upload loop from TestPyPI.
3. Verify on https://pypi.org/project/comfyui-workflow-templates-core/ etc.
4. Cut a GitHub Release tag (e.g., `v0.3.0`).

## Recovery & Troubleshooting

- **Upload interrupted:** rerun `twine upload` for the failing wheel. Already-uploaded files will be rejected; that’s OK.
- **Wrong file uploaded:** delete the release from TestPyPI via UI. For PyPI, reach out to admins; PyPI does not allow overwriting releases.
- **Missing token permissions:** ensure the token scope includes the new project names (`project:comfyui-workflow-templates-*`). PyPI tokens are project-specific.
- **Build failure:** re-run `run_full_validation.sh` to regenerate assets and confirm tests pass before uploading again.

## GitHub Actions Publishing (Optional)

1. In PyPI, under each project, add a Trusted Publisher for your repo (`comfy-org/workflow_templates` → `Publishing` → `Settings`).
2. Update `.github/workflows/publish.yml` to use the OIDC `pypi` publish action without storing secrets (check PyPI docs).
3. Publishing happens automatically when pyproject.toml changes are merged to main branch.
