#!/usr/bin/env python3
"""Validate model download links (properties.models) in ComfyUI workflow JSONs.

Catches the hand-editing mistakes that break the template library's model download:
missing / wrong watcher name, wrong `directory`, non-hex or stale SHA256, dead URL.

usage:
    python3 validate_model_links.py wf.json [wf2.json ...] [--no-network] [--json] [--strict]

exit: 0 = all good, 1 = at least one failure, 2 = usage
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

HF_API = "https://huggingface.co/api/models"

# node type -> (widget key that holds the filename, expected models/<dir>, number of files)
LOADERS = {
    "UNETLoader": ("unet_name", "diffusion_models", 1),
    "CLIPLoader": ("clip_name", "text_encoders", 1),
    "DualCLIPLoader": ("clip_name1", "text_encoders", 2),
    "TripleCLIPLoader": ("clip_name1", "text_encoders", 3),
    "CLIPVisionLoader": ("clip_name", "clip_vision", 1),
    "VAELoader": ("vae_name", "vae", 1),
    "LoraLoader": ("lora_name", "loras", 1),
    "LoraLoaderModelOnly": ("lora_name", "loras", 1),
    "CheckpointLoaderSimple": ("ckpt_name", "checkpoints", 1),
    "ControlNetLoader": ("control_net_name", "controlnet", 1),
    "UpscaleModelLoader": ("model_name", "upscale_models", 1),
    "StyleModelLoader": ("style_model_name", "style_models", 1),
    "GLIGENLoader": ("gligen_name", "gligen", 1),
}

HEX64 = re.compile(r"^[0-9a-f]{64}$")


def hf_token() -> str | None:
    for p in (os.path.expanduser("~/.cache/huggingface/token"), os.path.expanduser("~/.huggingface/token")):
        if os.path.exists(p):
            return open(p).read().strip() or None
    return os.environ.get("HF_TOKEN")


def get_json(url: str, token: str | None):
    h = {"User-Agent": "comfy-wf-validate"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=45) as r:
        return json.loads(r.read().decode())


def head(url: str, token: str | None):
    h = {"User-Agent": "comfy-wf-validate"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, method="HEAD", headers=h)
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.status, int(r.headers.get("Content-Length") or 0)


class Remote:
    """Cached HF repo tree lookups: path -> (sha256 lfs oid, size)."""

    def __init__(self, token):
        self.token = token
        self.cache: dict[str, dict[str, tuple[str | None, int]]] = {}

    def tree(self, repo: str):
        if repo in self.cache:
            return self.cache[repo]
        out: dict[str, tuple[str | None, int]] = {}
        try:
            url = f"{HF_API}/{repo}/tree/main?recursive=true"
            for item in get_json(url, self.token):
                if item.get("type") != "file":
                    continue
                oid = (item.get("lfs") or {}).get("oid") or item.get("oid")
                out[item["path"]] = (oid, int(item.get("size") or 0))
        except Exception as e:  # noqa: BLE001 - surfaced as a check failure
            out = {"__error__": (str(e), 0)}  # type: ignore[dict-item]
        self.cache[repo] = out
        return out


def parse_hf_url(url: str):
    m = re.match(r"^https://huggingface\.co/([^/]+/[^/]+)/resolve/([^/]+)/(.+)$", url)
    if not m:
        return None, None, None
    return m.group(1), m.group(2), m.group(3)


def widget_name(node: dict) -> dict[str, object]:
    named = node.get("widgets_values_named")
    if isinstance(named, dict):
        return named
    return {}


def check_node(node: dict, remote: Remote | None, strict: bool):
    """Return (errors, infos) for one node."""
    errs: list[str] = []
    infos: list[str] = []
    ntype = node.get("type", "")
    nid = node.get("id")

    if ntype not in LOADERS:
        if strict and ntype.endswith("Loader"):
            errs.append(f"node {nid} ({ntype}): unmapped loader type, add it to LOADERS in this script")
        return errs, infos

    key, want_dir, want_n = LOADERS[ntype]
    names = widget_name(node)
    fname = names.get(key) or (node.get("widgets_values") or [None])[0]
    entries = (node.get("properties") or {}).get("models")

    if not entries:
        errs.append(f"node {nid} ({ntype}): properties.models missing (loads {fname!r})")
        return errs, infos
    if not isinstance(entries, list):
        errs.append(f"node {nid} ({ntype}): properties.models is not a list")
        return errs, infos
    if len(entries) != want_n:
        errs.append(f"node {nid} ({ntype}): {len(entries)} models entries, expected {want_n}")

    for i, e in enumerate(entries):
        tag = f"node {nid} ({ntype}) models[{i}]"
        if not isinstance(e, dict):
            errs.append(f"{tag}: not an object")
            continue
        for k in ("name", "url", "directory"):
            if not e.get(k):
                errs.append(f"{tag}: missing {k}")
        name, url, directory = e.get("name"), e.get("url"), e.get("directory")
        if directory and directory != want_dir:
            errs.append(f"{tag}: directory {directory!r} != {want_dir!r} for {ntype}")
        if name and i == 0 and fname and name != fname:
            errs.append(f"{tag}: name {name!r} != widget value {fname!r}")
        if name and not name.endswith((".safetensors", ".ckpt", ".pt", ".pth", ".gguf", ".sft")):
            errs.append(f"{tag}: suspicious model filename {name!r}")

        sha = e.get("hash")
        if not sha:
            errs.append(f"{tag}: missing hash")
        elif e.get("hash_type", "SHA256").upper() != "SHA256":
            errs.append(f"{tag}: hash_type must be SHA256, got {e.get('hash_type')!r}")
        elif not HEX64.match(str(sha).lower()):
            errs.append(f"{tag}: hash is not 64 hex chars: {sha!r}")

        if not url:
            continue
        repo, rev, path = parse_hf_url(url)
        if not repo:
            errs.append(f"{tag}: url is not a huggingface resolve URL: {url}")
            continue
        if rev != "main":
            infos.append(f"{tag}: pinned revision {rev!r} (library expects main)")
        if name and path.rsplit("/", 1)[-1] != name:
            errs.append(f"{tag}: url filename {path.rsplit('/', 1)[-1]!r} != name {name!r}")
        if want_dir and path.split("/")[0] != want_dir and "/" in path:
            errs.append(f"{tag}: url directory {path.split('/')[0]!r} != {want_dir!r}")

        if remote is None:
            continue
        tree = remote.tree(repo)
        if "__error__" in tree:
            errs.append(f"{tag}: cannot read repo {repo}: {tree['__error__'][0]}")
            continue
        if path not in tree:
            errs.append(f"{tag}: {path} not found in {repo}")
            continue
        oid, size = tree[path]
        if oid and sha and str(sha).lower() != str(oid).lower():
            errs.append(f"{tag}: hash mismatch for {path}\n      workflow: {sha}\n      huggingface: {oid}")
        try:
            status, clen = head(url, remote.token)
            if status != 200:
                errs.append(f"{tag}: HEAD {status}")
            elif size and clen and clen != size:
                errs.append(f"{tag}: Content-Length {clen} != repo size {size}")
            else:
                infos.append(f"{tag}: url ok ({size / 1e9:.2f} GB)")
        except urllib.error.HTTPError as ex:
            errs.append(f"{tag}: HEAD {ex.code} {url}")
        except Exception as ex:  # noqa: BLE001
            errs.append(f"{tag}: HEAD failed ({ex})")
    return errs, infos


def validate(path: str, remote: Remote | None, strict: bool):
    data = json.load(open(path))
    rows, errs, infos = [], [], []
    for node in data.get("nodes", []):
        e, i = check_node(node, remote, strict)
        if node.get("type") in LOADERS:
            names = widget_name(node)
            key, want_dir, _ = LOADERS[node["type"]]
            fname = names.get(key) or (node.get("widgets_values") or [None])[0]
            entries = (node.get("properties") or {}).get("models") or []
            rows.append((node.get("id"), node["type"], fname, (entries[0].get("directory") if entries else None), "ok" if not e else "FAIL"))
        errs += e
        infos += i
    return rows, errs, infos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("workflows", nargs="+")
    ap.add_argument("--no-network", action="store_true", help="structure checks only (no HF API / HEAD)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--strict", action="store_true", help="fail on unmapped *Loader node types")
    a = ap.parse_args()

    remote = None if a.no_network else Remote(hf_token())
    failed = False
    report = {}

    for path in a.workflows:
        if not os.path.exists(path):
            print(f"!! not found: {path}", file=sys.stderr)
            failed = True
            continue
        rows, errs, infos = validate(path, remote, a.strict)
        report[path] = {"rows": rows, "errors": errs, "infos": infos}
        if not a.json:
            print(f"\n== {path}")
            if not rows:
                print("   (no model loader nodes)")
            for nid, ntype, fname, directory, state in rows:
                print(f"   [{state:4}] #{nid} {ntype:22} {fname}  ->  models/{directory}")
            for e in errs:
                print("   FAIL " + e)
            for i in infos:
                print("   · " + i)
        if errs:
            failed = True

    if a.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    print("\nRESULT:", "FAIL" if failed else "PASS", f"({len(a.workflows)} file(s))")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
