"""Resolve which PyPI versions were ever reached via ComfyUI's requirements.txt pin chain."""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

PINS_CACHE_SCHEMA_VERSION = 1
DEFAULT_PINS_CACHE_STALE_DAYS = 7

META_PIN_RE = re.compile(r"comfyui-workflow-templates==([0-9.]+(?:[a-zA-Z0-9.-]*)?)")

# Root pyproject uses underscores; PyPI project and ComfyUI pin use hyphens.
PYPI_NAME_ALIASES: dict[str, str] = {
    "comfyui_workflow_templates": "comfyui-workflow-templates",
}


def canonical_pypi_name(name: str) -> str:
    return PYPI_NAME_ALIASES.get(name, name)
SUBDEP_PIN_RE = re.compile(
    r"(comfyui-workflow-templates(?:-[a-z0-9-]+)?)==([0-9.]+(?:[a-zA-Z0-9.-]*)?)"
)


def ver_key(version: str) -> tuple[int, ...]:
    parts: list[int] = []
    for piece in version.split("."):
        digits = re.match(r"^(\d+)", piece)
        parts.append(int(digits.group(1)) if digits else 0)
    return tuple(parts)


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict | list | None:
    try:
        request = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def fetch_text(url: str, headers: dict[str, str] | None = None) -> str | None:
    try:
        request = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def github_headers(token: str | None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def parse_meta_pins_from_text(text: str) -> set[str]:
    return {match.group(1) for match in META_PIN_RE.finditer(text)}


class GitHubAPIError(RuntimeError):
    """Raised when the GitHub API returned no usable data (rate-limited or down)."""


def list_requirements_commit_shas(
    github_repo: str,
    requirements_path: str,
    *,
    token: str | None,
) -> list[str]:
    """SHAs of commits that modified requirements_path (newest first).

    Raises GitHubAPIError when no batches could be fetched at all. A short
    final page (<100 results) is treated as the end of history and returns
    normally.
    """
    owner, repo_name = github_repo.split("/", 1)
    gh = github_headers(token)
    shas: list[str] = []
    page = 1
    fetched_any_batch = False
    while page <= 50:
        query = urllib.parse.urlencode(
            {"path": requirements_path, "per_page": "100", "page": str(page)}
        )
        url = f"https://api.github.com/repos/{owner}/{repo_name}/commits?{query}"
        batch = fetch_json(url, gh)
        if not batch:
            if not fetched_any_batch:
                raise GitHubAPIError(
                    f"GitHub commits API returned no data for "
                    f"{owner}/{repo_name} (likely rate-limited or unauthorized). "
                    "Provide GITHUB_TOKEN to authenticate."
                )
            break
        fetched_any_batch = True
        for commit in batch:
            shas.append(commit["sha"])
        if len(batch) < 100:
            break
        page += 1
    return shas


def fetch_requirements_at_ref(
    github_repo: str,
    requirements_path: str,
    ref: str,
) -> str | None:
    owner, repo_name = github_repo.split("/", 1)
    return fetch_text(
        f"https://raw.githubusercontent.com/{owner}/{repo_name}/{ref}/{requirements_path}"
    )


def collect_comfyui_meta_pins_via_github_api(
    github_repo: str,
    requirements_path: str,
    *,
    token: str | None,
    default_branch: str = "master",
) -> tuple[set[str], list[str]]:
    """Full refresh: every commit that touched requirements_path (no git clone)."""
    shas = list_requirements_commit_shas(github_repo, requirements_path, token=token)
    pins: set[str] = set()

    branch_text = fetch_requirements_at_ref(github_repo, requirements_path, default_branch)
    if branch_text:
        pins |= parse_meta_pins_from_text(branch_text)

    for sha in shas:
        text = fetch_requirements_at_ref(github_repo, requirements_path, sha)
        if text:
            pins |= parse_meta_pins_from_text(text)

    return pins, shas


def cache_matches_config(cache: dict[str, Any], ref_cfg: dict) -> bool:
    return (
        cache.get("schema_version") == PINS_CACHE_SCHEMA_VERSION
        and cache.get("github_repo") == ref_cfg.get("github_repo", "Comfy-Org/ComfyUI")
        and cache.get("requirements_path") == ref_cfg.get("requirements_path", "requirements.txt")
        and cache.get("default_branch") == ref_cfg.get("default_branch", "master")
    )


def load_pins_cache(cache_path: Path) -> dict[str, Any] | None:
    if not cache_path.is_file():
        return None
    try:
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def cache_age_days(cache: dict[str, Any]) -> float | None:
    raw = cache.get("updated_at")
    if not isinstance(raw, str):
        return None
    try:
        updated = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=UTC)
    delta = datetime.now(UTC) - updated
    return delta.total_seconds() / 86400


def cache_is_stale(cache: dict[str, Any], stale_after_days: float) -> bool:
    age = cache_age_days(cache)
    if age is None:
        return True
    return age >= stale_after_days


def save_pins_cache(cache_path: Path, data: dict[str, Any]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        **data,
        "schema_version": PINS_CACHE_SCHEMA_VERSION,
        "updated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
    }
    pins_sorted = sorted(set(payload.get("meta_pins", [])), key=ver_key)
    known_sorted = sorted(set(payload.get("known_commit_shas", [])))
    payload["meta_pins"] = pins_sorted
    payload["known_commit_shas"] = known_sorted
    cache_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def refresh_pins_cache_incremental(
    cache_path: Path,
    ref_cfg: dict,
    *,
    token: str | None,
    force_full: bool = False,
) -> tuple[set[str], str, bool]:
    """
    Refresh the on-disk pins cache from GitHub. Always writes the cache file
    (callers decide whether to commit it).

    Returns (meta_pins, source_label, cache_changed).
    `cache_changed` is True when the new payload differs from the prior file
    contents (or the file did not exist before).
    """
    github_repo = ref_cfg.get("github_repo", "Comfy-Org/ComfyUI")
    requirements_path = ref_cfg.get("requirements_path", "requirements.txt")
    default_branch = ref_cfg.get("default_branch", "master")

    prior = load_pins_cache(cache_path)
    prior_pins = set(prior.get("meta_pins", [])) if prior else set()
    prior_head = prior.get("head_commit_sha") if prior else None
    prior_known = set(prior.get("known_commit_shas", [])) if prior else set()

    needs_full = (
        prior is None
        or force_full
        or not cache_matches_config(prior, ref_cfg)
        or not prior_pins
    )

    if needs_full:
        pins, shas = collect_comfyui_meta_pins_via_github_api(
            github_repo,
            requirements_path,
            token=token,
            default_branch=default_branch,
        )
        new_payload = {
            "github_repo": github_repo,
            "requirements_path": requirements_path,
            "default_branch": default_branch,
            "head_commit_sha": shas[0] if shas else None,
            "known_commit_shas": sorted(set(shas)),
            "meta_pins": sorted(pins, key=ver_key),
        }
        save_pins_cache(cache_path, new_payload)
        changed = pins != prior_pins or (shas[0] if shas else None) != prior_head
        return pins, "cache (full rebuild via GitHub API)", changed

    shas = list_requirements_commit_shas(github_repo, requirements_path, token=token)
    head = shas[0] if shas else prior_head
    new_shas = [sha for sha in shas if sha not in prior_known]

    pins = set(prior_pins)
    branch_text = fetch_requirements_at_ref(github_repo, requirements_path, default_branch)
    if branch_text:
        pins |= parse_meta_pins_from_text(branch_text)
    for sha in new_shas:
        text = fetch_requirements_at_ref(github_repo, requirements_path, sha)
        if text:
            pins |= parse_meta_pins_from_text(text)

    known = prior_known | set(new_shas)
    new_payload = {
        "github_repo": github_repo,
        "requirements_path": requirements_path,
        "default_branch": default_branch,
        "head_commit_sha": head,
        "known_commit_shas": sorted(known),
        "meta_pins": sorted(pins, key=ver_key),
    }
    save_pins_cache(cache_path, new_payload)
    changed = pins != prior_pins or head != prior_head or bool(new_shas)
    source = (
        f"cache refreshed (+{len(new_shas)} new commit(s) via GitHub API)"
        if new_shas
        else "cache refreshed (no new requirements.txt commits)"
    )
    return pins, source, changed


def clone_comfyui_repo(github_repo: str, depth: int) -> Path:
    dest = Path(tempfile.mkdtemp(prefix="comfyui-ref-"))
    args = ["git", "clone", "--filter=blob:none", "--sparse"]
    if depth > 0:
        args.extend(["--depth", str(depth)])
    args.extend([f"https://github.com/{github_repo}.git", str(dest)])
    subprocess.run(args, check=True, capture_output=True, text=True)
    subprocess.run(
        ["git", "sparse-checkout", "set", "requirements.txt"],
        cwd=dest,
        check=True,
        capture_output=True,
        text=True,
    )
    return dest


def resolve_comfyui_repo(cfg: dict, env: dict[str, str] | None = None) -> Path | None:
    env = env or {}
    var = cfg.get("env_repo_path_var", "COMFYUI_REPO_PATH")
    env_path = env.get(var, "") or cfg.get("env_repo_path") or ""
    if env_path:
        path = Path(env_path).expanduser().resolve()
        return path if path.is_dir() else None

    local = cfg.get("local_repo_path")
    if local:
        path = Path(local).expanduser()
        if not path.is_absolute():
            root = Path(__file__).resolve().parents[2]
            path = (root / path).resolve()
        return path if path.is_dir() else None

    github_repo = cfg.get("github_repo", "Comfy-Org/ComfyUI")
    depth = int(cfg.get("clone_depth", 500))
    try:
        return clone_comfyui_repo(github_repo, depth)
    except subprocess.CalledProcessError:
        return None


def collect_comfyui_meta_pins(repo: Path, requirements_path: str) -> set[str]:
    """Local git: current file + `git log -p` additions (for dev with COMFYUI_REPO_PATH)."""
    req_file = repo / requirements_path
    pins: set[str] = set()

    if req_file.is_file():
        pins |= parse_meta_pins_from_text(req_file.read_text(encoding="utf-8", errors="replace"))

    try:
        log = subprocess.run(
            ["git", "log", "-p", "--", requirements_path],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=180,
            check=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return pins

    for line in log.stdout.splitlines():
        if not line.startswith("+") or "comfyui-workflow-templates==" not in line:
            continue
        match = META_PIN_RE.search(line)
        if match:
            pins.add(match.group(1))
    return pins


def resolve_pins_cache_path(ref_cfg: dict, repo_root: Path) -> Path | None:
    rel = ref_cfg.get("pins_cache_file")
    if not rel:
        return None
    return (repo_root / rel).resolve()


def collect_comfyui_meta_pins_auto(
    ref_cfg: dict,
    env: dict[str, str] | None = None,
    *,
    repo_path_override: str | None = None,
    repo_root: Path | None = None,
) -> tuple[set[str], str, bool]:
    """
    Resolve ComfyUI meta pins via, in priority order:
      1. Local ComfyUI checkout (COMFYUI_REPO_PATH) — dev convenience, no cache write.
      2. On-disk pins cache (.github/cache/...) — used as-is when fresh; refreshed
         from GitHub API when missing or older than `pins_cache_stale_days`.
      3. Fallback: live GitHub API fetch (no cache file configured).
      4. Last resort: shallow sparse clone of ComfyUI.

    Returns (pins, source_label, cache_changed). `cache_changed` is True only
    when this call modified the cache file on disk (caller can git-commit it).
    """
    env = env or {}
    requirements_path = ref_cfg.get("requirements_path", "requirements.txt")

    var = ref_cfg.get("env_repo_path_var", "COMFYUI_REPO_PATH")
    if repo_path_override:
        env = {**env, var: repo_path_override}

    # Local dev: explicit ComfyUI checkout wins
    env_path = env.get(var, "")
    if env_path and Path(env_path).expanduser().is_dir():
        repo = Path(env_path).expanduser().resolve()
        return collect_comfyui_meta_pins(repo, requirements_path), "git (local repo)", False

    token_var = ref_cfg.get("github_token_var", "GITHUB_TOKEN")
    token = env.get(token_var) or env.get("GH_TOKEN")
    root = repo_root or Path(__file__).resolve().parents[2]
    cache_path = resolve_pins_cache_path(ref_cfg, root)
    stale_after = float(
        ref_cfg.get("pins_cache_stale_days", DEFAULT_PINS_CACHE_STALE_DAYS)
    )

    if cache_path is not None:
        existing = load_pins_cache(cache_path)
        if existing is not None and cache_matches_config(existing, ref_cfg):
            if not cache_is_stale(existing, stale_after):
                pins = set(existing.get("meta_pins", []))
                age = cache_age_days(existing)
                age_label = f"{age:.1f}d old" if age is not None else "unknown age"
                return pins, f"cache hit ({cache_path.name}, {age_label})", False
        # Cache missing, schema-mismatched, or stale → refresh on disk
        try:
            pins, source, changed = refresh_pins_cache_incremental(
                cache_path,
                ref_cfg,
                token=token,
                force_full=existing is None or not cache_matches_config(existing or {}, ref_cfg),
            )
            if pins:
                return pins, source, changed
        except GitHubAPIError as exc:
            # Fall back to a known-good stale cache rather than a misleading
            # partial result — orphan analysis with too few pins would wildly
            # over-count reclaimable bytes.
            if existing is not None and existing.get("meta_pins"):
                pins = set(existing.get("meta_pins", []))
                age = cache_age_days(existing)
                age_label = f"{age:.1f}d old" if age is not None else "unknown age"
                return pins, f"stale cache fallback ({age_label}; {exc})", False
            return set(), f"github_api unavailable: {exc}", False

    # No cache configured: live fetch, no persistence
    github_repo = ref_cfg.get("github_repo", "Comfy-Org/ComfyUI")
    default_branch = ref_cfg.get("default_branch", "master")
    try:
        pins, _shas = collect_comfyui_meta_pins_via_github_api(
            github_repo,
            requirements_path,
            token=token,
            default_branch=default_branch,
        )
    except GitHubAPIError as exc:
        return set(), f"github_api unavailable: {exc}", False
    if pins:
        return pins, "github_api (live, no cache)", False

    repo = resolve_comfyui_repo(ref_cfg, env)
    if repo is not None:
        return collect_comfyui_meta_pins(repo, requirements_path), "git (sparse clone)", False

    return set(), "unavailable", False


def pins_for_meta_version(meta_version: str, cache: dict[str, dict[str, str]]) -> dict[str, str]:
    if meta_version in cache:
        return cache[meta_version]
    url = f"https://pypi.org/pypi/comfyui-workflow-templates/{meta_version}/json"
    data = fetch_json(url)
    pins: dict[str, str] = {}
    if data:
        for req in data.get("info", {}).get("requires_dist") or []:
            if "extra" in req:
                continue
            match = SUBDEP_PIN_RE.search(req)
            if match:
                pins[match.group(1)] = match.group(2)
    cache[meta_version] = pins
    return pins


def build_comfyui_referenced_versions(
    meta_pins: set[str],
) -> tuple[dict[str, set[str]], set[str], dict[str, str]]:
    """Return (pypi_name -> referenced versions, meta pins set, current meta -> subdep map for latest)."""
    cache: dict[str, dict[str, str]] = {}
    referenced: dict[str, set[str]] = {}
    current_meta = max(meta_pins, key=ver_key) if meta_pins else None
    current_subdeps: dict[str, str] = {}

    for meta_v in sorted(meta_pins, key=ver_key):
        subdeps = pins_for_meta_version(meta_v, cache)
        if meta_v == current_meta:
            current_subdeps = subdeps
        for name, version in subdeps.items():
            referenced.setdefault(name, set()).add(version)
        # ComfyUI pins the meta package itself
        referenced.setdefault("comfyui-workflow-templates", set()).add(meta_v)

    return referenced, meta_pins, current_subdeps


def pypi_release_sizes(pypi_name: str) -> dict[str, int]:
    data = fetch_json(f"https://pypi.org/pypi/{pypi_name}/json")
    if not data:
        return {}
    sizes: dict[str, int] = {}
    for version, files in data.get("releases", {}).items():
        sizes[version] = sum(int(f.get("size", 0)) for f in files)
    return sizes


def delete_candidates_for_package(
    pypi_name: str,
    referenced_versions: set[str],
) -> tuple[list[tuple[str, int]], list[tuple[str, int]], int]:
    """Return (keep_list, delete_list, reclaimable_bytes)."""
    all_sizes = pypi_release_sizes(pypi_name)
    keep: list[tuple[str, int]] = []
    delete: list[tuple[str, int]] = []
    for version, size in sorted(all_sizes.items(), key=lambda x: ver_key(x[0])):
        if version in referenced_versions:
            keep.append((version, size))
        else:
            delete.append((version, size))
    reclaimable = sum(size for _, size in delete)
    return keep, delete, reclaimable
