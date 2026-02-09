# Publishing the Workflow Templates Packages

This repository now produces seven wheels:

- `comfyui-workflow-templates-core`
- `comfyui-workflow-templates-media-api`
- `comfyui-workflow-templates-media-video`
- `comfyui-workflow-templates-media-image`
- `comfyui-workflow-templates-media-other`
- `comfyui-subgraph-blueprints`
- `comfyui-workflow-templates` (meta package that depends on all bundles, built from the root `pyproject.toml`)

The meta package is built from the repository root `pyproject.toml`, not from a `packages/meta/` directory. It pins exact versions of each subpackage as dependencies.

Publishing is largely automated via CI. When a PR with template changes merges to `main`, version bumps and publishing happen automatically. The manual workflow below is provided for reference or recovery scenarios.

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

## 1. Build Wheels Locally

Most publishing is automated via CI (see below). If you need to build locally for testing or recovery:

```bash
git checkout main
git pull

./run_full_validation.sh
```

This script regenerates the manifest, rebuilds all wheels into `./dist/`, runs lint/tests, and performs `twine check`.

Version bumping is handled automatically by CI via `scripts/ci_version_manager.py`, which runs in the `version-check.yml` workflow on every PR that touches templates or `bundles.json`. If you need to manually inspect or trigger version bumps locally, you can run:

```bash
python scripts/ci_version_manager.py
```

This will detect which packages have changed since their last version bump and apply patch-level bumps to the affected subpackages.

## 2. Dry Run on TestPyPI

1. Export the TestPyPI token (or pass with `-u __token__ -p pypi-...`):
   ```bash
    export TWINE_REPOSITORY=testpypi
    export TWINE_USERNAME="__token__"
    export TWINE_PASSWORD="pypi-<testpypi-token>"
   ```
2. Upload each wheel/sdist pair. A simple loop:
   ```bash
    for pkg in core media_api media_video media_image media_other blueprints; do
      twine upload dist/comfyui_workflow_templates_${pkg}-*.whl dist/comfyui_workflow_templates_${pkg}-*.tar.gz
    done
   ```
   The blueprints package uses a different naming convention:
   ```bash
    twine upload dist/comfyui_subgraph_blueprints-*.whl dist/comfyui_subgraph_blueprints-*.tar.gz
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

## GitHub Actions Publishing

Publishing to PyPI is automated via `.github/workflows/publish.yml`. This workflow:

1. **Triggers** on pushes to `main` that change `pyproject.toml` (i.e., when a version-bump PR merges), or via manual `workflow_dispatch`.
2. **Detects** which packages have new versions by comparing the commit diff.
3. **Builds and publishes** subpackages first, then the meta package, using `twine` with the `PYPI_TOKEN` repository secret (classic API token auth).
4. **Creates a GitHub Release** with auto-generated release notes.
5. **Includes recovery mode**: on manual dispatch, it checks all packages against PyPI and publishes any that are out of sync.

Version bumping on PRs is handled separately by `.github/workflows/version-check.yml`, which runs `scripts/ci_version_manager.py` to auto-bump affected packages and commit the changes back to the PR branch.

## Recovery & Troubleshooting

- **Upload interrupted:** rerun `twine upload` for the failing wheel. Already-uploaded files will be rejected; that's OK.
- **Wrong file uploaded:** delete the release from TestPyPI via UI. For PyPI, reach out to admins; PyPI does not allow overwriting releases.
- **Missing token permissions:** ensure the token scope includes the new project names (`project:comfyui-workflow-templates-*`). PyPI tokens are project-specific.
- **Build failure:** re-run `run_full_validation.sh` to regenerate assets and confirm tests pass before uploading again.
- **Packages out of sync with PyPI:** trigger the publish workflow manually via `workflow_dispatch`; recovery mode will detect and publish any mismatched versions.
