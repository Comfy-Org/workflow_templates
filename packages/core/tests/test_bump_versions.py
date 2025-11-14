import os
import subprocess
import sys
from pathlib import Path
from textwrap import dedent

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "bump_versions.py"

PACKAGES = {
    "core": "comfyui-workflow-templates-core",
    "media_api": "comfyui-workflow-templates-media-api",
    "media_image": "comfyui-workflow-templates-media-image",
    "media_other": "comfyui-workflow-templates-media-other",
    "media_video": "comfyui-workflow-templates-media-video",
    "meta": "comfyui-workflow-templates",
}


@pytest.fixture()
def temp_repo(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()

    (repo / "templates").mkdir()
    (repo / "packages").mkdir()
    for name in PACKAGES:
        pkg_dir = repo / "packages" / name
        pkg_dir.mkdir(parents=True, exist_ok=True)
        pyproject = pkg_dir / "pyproject.toml"
        pip_name = PACKAGES[name]
        pyproject.write_text(
            dedent(
                f"""
                [build-system]
                requires = ["setuptools>=61.0"]
                build-backend = "setuptools.build_meta"

                [project]
                name = "{pip_name}"
                version = "0.1.0"
                """
            ).strip()
            + "\n"
        )

    # Root pyproject with dependency constraints
    root_pyproject = repo / "pyproject.toml"
    root_pyproject.write_text(
        dedent(
            """
            [build-system]
            requires = ["setuptools>=61.0"]
            build-backend = "setuptools.build_meta"

            [project]
            name = "comfyui_workflow_templates"
            version = "0.1.0"
            description = "Meta package"
            requires-python = ">=3.9"
            license = "MIT"

            dependencies = [
                "comfyui-workflow-templates-core>=0.1.0",
                "comfyui-workflow-templates-media-api>=0.1.0",
                "comfyui-workflow-templates-media-video>=0.1.0",
                "comfyui-workflow-templates-media-image>=0.1.0",
                "comfyui-workflow-templates-media-other>=0.1.0"
            ]
            """
        ).strip()
        + "\n"
    )
    meta_project = repo / "packages" / "meta" / "pyproject.toml"
    deps_block = dedent(
        """
        dependencies = [
            "comfyui-workflow-templates-core>=0.1.0",
            "comfyui-workflow-templates-media-api>=0.1.0",
            "comfyui-workflow-templates-media-video>=0.1.0",
            "comfyui-workflow-templates-media-image>=0.1.0",
            "comfyui-workflow-templates-media-other>=0.1.0"
        ]
        """
    ).strip()
    meta_project.write_text(meta_project.read_text() + "\n" + deps_block)

    (repo / "bundles.json").write_text(
        dedent(
            """
            {
              "media-image": ["foo_template"],
              "media-api": [],
              "media-video": [],
              "media-other": []
            }
            """
        ).strip()
        + "\n"
    )
    (repo / "templates" / "foo_template.json").write_text("{}\n")

    subprocess.run(["git", "init"], cwd=repo, check=True, stdout=subprocess.PIPE)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo, check=True)
    subprocess.run(["git", "tag", "v0.1.0"], cwd=repo, check=True)

    yield repo


def run_script(repo: Path, *args: str, check: bool = True):
    env = os.environ.copy()
    env["WORKFLOW_TEMPLATES_ROOT"] = str(repo)
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH), *args],
        env=env,
        cwd=repo,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=check,
    )


def read_version(repo: Path, rel_path: str) -> str:
    import re

    text = (repo / rel_path).read_text()
    match = re.search(r'version\s*=\s*"(\d+\.\d+\.\d+)"', text)
    if not match:
        raise AssertionError(f"version not found in {rel_path}")
    return match.group(1)


def assert_dependency_version(repo: Path, pip_name: str, expected: str):
    text = (repo / "pyproject.toml").read_text()
    needle = f"{pip_name}>={expected}"
    assert needle in text


def test_no_changes(temp_repo):
    result = run_script(temp_repo, "--base-ref", "v0.1.0")
    assert "No package changes" in result.stdout
    for rel in [
        "pyproject.toml",
        "packages/meta/pyproject.toml",
        "packages/core/pyproject.toml",
    ]:
        assert read_version(temp_repo, rel) == "0.1.0"


def test_template_change_bumps_bundle_and_meta(temp_repo):
    template_file = temp_repo / "templates" / "foo_template-1.webp"
    template_file.write_text("binary")
    subprocess.run(["git", "add", "templates"], cwd=temp_repo, check=True)
    subprocess.run(["git", "commit", "-m", "template update"], cwd=temp_repo, check=True)

    run_script(temp_repo, "--base-ref", "v0.1.0")

    assert read_version(temp_repo, "packages/media_image/pyproject.toml") == "0.1.1"
    assert read_version(temp_repo, "packages/meta/pyproject.toml") == "0.1.1"
    assert read_version(temp_repo, "packages/core/pyproject.toml") == "0.1.0"
    assert_dependency_version(temp_repo, "comfyui-workflow-templates-media-image", "0.1.1")


def test_core_change_bumps_core_and_meta(temp_repo):
    core_file = temp_repo / "packages" / "core" / "src" / "dummy.py"
    core_file.parent.mkdir(parents=True, exist_ok=True)
    core_file.write_text("print('hi')\n")
    subprocess.run(["git", "add", "packages/core"], cwd=temp_repo, check=True)
    subprocess.run(["git", "commit", "-m", "core change"], cwd=temp_repo, check=True)

    run_script(temp_repo, "--base-ref", "v0.1.0")

    assert read_version(temp_repo, "packages/core/pyproject.toml") == "0.1.1"
    assert read_version(temp_repo, "packages/meta/pyproject.toml") == "0.1.1"
    assert_dependency_version(temp_repo, "comfyui-workflow-templates-core", "0.1.1")
