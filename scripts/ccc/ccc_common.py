#!/usr/bin/env python3
"""Shared, read-only helpers for the CCC scripts.

`audit_map.py` (builds the identity ledger), `pull_records.py` (snapshots the live records)
and `sync_to_ccc.py` (writes drafts) all import this module, so they can never disagree
about what a slug, a title family or a graph fingerprint means.

Nothing in here writes to the catalog: every request is a GET. The UI->API converter is the
same one `comfy-cli` shells out to, called in process because the subprocess costs 2-20 s per
template while the call itself costs ~1 ms.
"""

from __future__ import annotations

import collections
import hashlib
import json
import logging
import os
import re
import threading
import time
from pathlib import Path

import requests

DEFAULT_BASE = "https://cloud.comfy.org"

MODEL_KEYS = ("ckpt_name", "unet_name", "vae_name", "clip_name", "lora_name", "model",
              "model_name", "checkpoint", "weights")
SHARE_ID = re.compile(r"-[0-9a-f]{12}$")          # legacy Hub share id appended to public slugs
VERSION_TOKEN = re.compile(r"^v?\d+(?:\.\d+)*$")  # `1.1`, `2.5`, `4`, `v3`

# The fields `pull_records.py` snapshots. Short copy (title/description/tags/model_labels) is
# authored in templates/index.json; the long-form half is authored in the catalog and must
# survive a sync, so it lives in scripts/ccc/records.json and is read back from there.
RECORD_FIELDS = (
    "uid", "slug", "template_name", "title", "description", "long_description",
    "tags", "model_labels", "template_category", "io", "output_type", "generation_type",
    "faq", "use_cases", "runnable", "compatibility",
)
LONG_FORM_FIELDS = ("long_description", "faq", "use_cases", "runnable", "compatibility")

# Which node classes mean which output modality. Used to check that a version successor is
# still the same kind of workflow (an image workflow must not adopt a video record).
_OUTPUT_CLASSES = (
    ("video", ("SaveVideo", "SaveWEBM", "VHS_VideoCombine", "CreateVideo", "SaveAnimatedWEBP",
               "SaveSVGToVideo")),
    ("audio", ("SaveAudio", "PreviewAudio", "SaveAudioMP3", "SaveAudioOpus")),
    ("image", ("SaveImage", "PreviewImage", "Image Save", "SaveImageWebsocket")),
    ("3d", ("SaveGLB", "SaveMesh", "Preview3D", "ExportGLB", "Save3D")),
)


# ----------------------------------------------------------------------------- names
def kebab(text: str) -> str:
    s = (text or "").lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-{2,}", "-", s).strip("-")


def slug_core(slug: str) -> str:
    """Public slugs end in `-<12 hex>`; the part before it is the readable, stable half."""
    return SHARE_ID.sub("", (slug or "").strip("-/").split("/")[-1])


def norm_title(text: str) -> str:
    """Lowercase, punctuation-free, whitespace-collapsed — the identity of a title's wording."""
    s = (text or "").lower().replace("&", " and ")
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", s).split())


def title_family(text: str) -> str:
    """A title with its version tokens removed: `Flux 1.1 Pro` and `Flux 1.2 Pro` agree."""
    words = [w for w in norm_title(text).split() if not VERSION_TOKEN.match(w)]
    return " ".join(words)


def title_version(text: str) -> tuple:
    """The leading version number of a title as a comparable tuple: `2.5` -> (2, 5), `v4` -> (4,).

    `()` when the title carries no version at all, which makes it the oldest of its family.
    """
    for word in norm_title(text).split():
        if VERSION_TOKEN.match(word):
            nums = word.lstrip("v").split(".")
            try:
                return tuple(int(n) for n in nums)
            except ValueError:
                return ()
    return ()


# ----------------------------------------------------------------------------- graphs
def signature(graph: dict):
    """(node class-type multiset, model weight filenames) — what survives a rename."""
    classes = collections.Counter()
    models = set()
    for node in (graph or {}).values():
        if not isinstance(node, dict):
            continue
        classes[node.get("class_type") or "?"] += 1
        for key, value in (node.get("inputs") or {}).items():
            if key in MODEL_KEYS or key.endswith(("_name", "_file")):
                if isinstance(value, str) and value.lower().endswith(
                        (".safetensors", ".ckpt", ".pth", ".pt", ".bin", ".gguf", ".onnx")):
                    models.add(value)
    return classes, frozenset(models)


def jaccard(a: collections.Counter, b: collections.Counter) -> float:
    inter = sum((a & b).values())
    union = sum((a | b).values())
    return inter / union if union else 0.0


def set_jaccard(a: frozenset, b: frozenset) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b) if (a | b) else 1.0


def graph_modalities(classes: collections.Counter) -> frozenset:
    """Crude but stable output modality of a graph, from the saver classes it contains."""
    kinds = set()
    for kind, names in _OUTPUT_CLASSES:
        if any(classes.get(name) for name in names):
            kinds.add(kind)
    return frozenset(kinds)


def io_modalities(entry: dict) -> frozenset:
    """Output modalities the template file declares (`io.outputs[].mediaType`, else mediaType)."""
    io_block = (entry or {}).get("io") or {}
    kinds = {(out or {}).get("mediaType") for out in (io_block.get("outputs") or [])}
    kinds = {k for k in kinds if k}
    if not kinds and (entry or {}).get("mediaType"):
        kinds = {entry["mediaType"]}
    return frozenset(kinds)


def sha8(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


# ----------------------------------------------------------------------------- client
class CatalogError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, detail: str = ""):
        super().__init__(f"{method} {path} -> {status} {detail}"[:400])
        self.status = status


class Client:
    """GET-only catalog client. One `requests.Session` per thread (sessions are not shareable)."""

    def __init__(self, base: str | None = None, key: str | None = None, retries: int = 4):
        self.base = (base or os.environ.get("CCC_API_BASE_URL") or DEFAULT_BASE).rstrip("/")
        self.key = key or os.environ.get("CCC_API_KEY") or ""
        if not self.key:
            raise SystemExit("CCC_API_KEY is not set")
        self.retries = retries
        self._local = threading.local()

    @property
    def session(self) -> requests.Session:
        s = getattr(self._local, "session", None)
        if s is None:
            s = requests.Session()
            s.headers.update({"X-API-Key": self.key, "Accept": "application/json"})
            self._local.session = s
        return s

    def abs_get(self, url: str):
        """(status, text) for an absolute URL that is not under /api/v1/catalog."""
        r = self.session.get(url, timeout=120)
        return r.status_code, r.text

    def get(self, path: str, params: dict | None = None, retries: int | None = None):
        """GET /api/v1/catalog<path> with backoff on 429/5xx. Raises CatalogError."""
        url = self.base + "/api/v1/catalog" + path
        attempts = retries or self.retries
        last = None
        for attempt in range(attempts):
            try:
                r = self.session.get(url, params=params, timeout=(15, 120))
            except requests.RequestException as exc:
                last = CatalogError("GET", path, 0, str(exc))
                if attempt == attempts - 1:
                    raise last
                time.sleep(min(20, 2 * (attempt + 1)))
                continue
            if r.status_code in (429, 500, 502, 503, 504):
                last = CatalogError("GET", path, r.status_code, r.text[:200])
                if attempt == attempts - 1:
                    raise last
                time.sleep(min(20, 2 * (attempt + 1)))
                continue
            if r.status_code >= 400:
                raise CatalogError("GET", path, r.status_code, r.text[:400])
            return r.json() if r.content else {}
        raise last or CatalogError("GET", path, 0, "unreachable")

    # --- higher-level reads
    def live(self):
        """Every live WORKFLOW record, one page at a time."""
        out, cursor = [], None
        while True:
            path = "/items?kind=WORKFLOW&limit=100" + (f"&cursor={cursor}" if cursor else "")
            d = self.get(path)
            out += d.get("items", [])
            if not d.get("has_more") or not d.get("next_cursor"):
                return out
            cursor = d["next_cursor"]

    def record(self, uid: str) -> dict:
        """The full record document for one uid (`data` when the API wraps it)."""
        d = self.get(f"/items/{uid}")
        return d.get("data") or d

    def media(self, ref: dict) -> dict | None:
        if not ref or not ref.get("id"):
            return None
        url = f"{self.base}/api/v1/catalog/media/{ref['id']}/{ref['file_version_uid']}"
        status, text = self.abs_get(url)
        if status != 200:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None


# ----------------------------------------------------------------------------- conversion
def object_info(source, work: Path) -> dict | None:
    """One fetch of the Cloud object_info, cached in `.ccc-work/object_info.json` (shared)."""
    cached = work / "object_info.json"
    if cached.exists():
        try:
            return json.loads(cached.read_text())
        except json.JSONDecodeError:
            pass
    status, text = source.abs_get(source.base + "/api/object_info")
    if status != 200:
        return None
    work.mkdir(parents=True, exist_ok=True)
    cached.write_text(text)
    return json.loads(text)


def ui_to_api(repo: Path, stem: str, work: Path, oi, cache: bool = False) -> dict | None:
    """`templates/<stem>.json` -> API prompt, in process. None when it cannot be converted."""
    if oi is None:
        return None
    ui = repo / "templates" / f"{stem}.json"
    cache_file = None
    if cache:
        # content addressed: a stale graph can never be served for an edited template
        cache_file = work / "api" / f"{stem}-{sha8(ui)}.api.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text())
            except json.JSONDecodeError:
                pass
    try:
        from comfy_cli.workflow_to_api import convert_ui_to_api
    except Exception:  # comfy-cli not installed: the caller falls back to the CLI
        return None
    # the converter logs a warning per unmapped widget on unknown node types; the conversion
    # is still correct, and 775 templates of that would bury the run log
    logging.getLogger("comfy_cli.workflow_to_api").setLevel(logging.ERROR)
    try:
        api = convert_ui_to_api(json.loads(ui.read_text()), oi)
    except Exception:
        return None
    if not api:
        return None
    if cache_file is not None:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(api, indent=1))
    return api
