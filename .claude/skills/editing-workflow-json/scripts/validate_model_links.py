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
import urllib.parse
import urllib.request

HF_API = "https://huggingface.co/api/models"

# node type -> (widget keys that hold filenames in load order, expected models/<dir>)
LOADERS = {
    "UNETLoader": (("unet_name",), "diffusion_models"),
    "CLIPLoader": (("clip_name",), "text_encoders"),
    "DualCLIPLoader": (("clip_name1", "clip_name2"), "text_encoders"),
    "TripleCLIPLoader": (("clip_name1", "clip_name2", "clip_name3"), "text_encoders"),
    "CLIPVisionLoader": (("clip_name",), "clip_vision"),
    "VAELoader": (("vae_name",), "vae"),
    "LoraLoader": (("lora_name",), "loras"),
    "LoraLoaderModelOnly": (("lora_name",), "loras"),
    "CheckpointLoaderSimple": (("ckpt_name",), "checkpoints"),
    "ControlNetLoader": (("control_net_name",), "controlnet"),
    "UpscaleModelLoader": (("model_name",), "upscale_models"),
    "StyleModelLoader": (("style_model_name",), "style_models"),
    "GLIGENLoader": (("gligen_name",), "gligen"),
}

HEX64 = re.compile(r"^[0-9a-f]{64}$")


def hf_token() -> str | None:
    for p in (os.path.expanduser("~/.cache/huggingface/token"), os.path.expanduser("~/.huggingface/token")):
        if os.path.exists(p):
            return open(p).read().strip() or None
    return os.environ.get("HF_TOKEN")


def _headers(token: str | None) -> dict[str, str]:
    h = {"User-Agent": "comfy-wf-validate"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _next_link(link_header: str | None) -> str | None:
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            start = part.find("<")
            end = part.find(">")
            if start >= 0 and end > start:
                return part[start + 1:end]
    return None


def get_json_pages(url: str, token: str | None):
    """Fetch a JSON list, following Link: rel=next pagination."""
    items: list = []
    while url:
        with urllib.request.urlopen(
            urllib.request.Request(url, headers=_headers(token)), timeout=45
        ) as r:
            batch = json.loads(r.read().decode())
            link = r.headers.get("Link")
        if isinstance(batch, list):
            items.extend(batch)
        else:
            return batch
        url = _next_link(link)
    return items


def head(url: str, token: str | None):
    req = urllib.request.Request(url, method="HEAD", headers=_headers(token))
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.status, int(r.headers.get("Content-Length") or 0)


class Remote:
    """Cached HF repo tree lookups: path -> (sha256 lfs oid, size)."""

    def __init__(self, token):
        self.token = token
        self.cache: dict[str, dict[str, tuple[str | None, int]]] = {}

    def tree(self, repo: str, rev: str = "main"):
        key = f"{repo}@{rev}"
        if key in self.cache:
            return self.cache[key]
        out: dict[str, tuple[str | None, int]] = {}
        try:
            url = f"{HF_API}/{repo}/tree/{rev}?recursive=true"
            for item in get_json_pages(url, self.token):
                if not isinstance(item, dict) or item.get("type") != "file":
                    continue
                oid = (item.get("lfs") or {}).get("oid") or item.get("oid")
                out[item["path"]] = (oid, int(item.get("size") or 0))
        except Exception as e:  # noqa: BLE001 - surfaced as a check failure
            out = {"__error__": (str(e), 0)}  # type: ignore[dict-item]
        self.cache[key] = out
        return out


def parse_hf_url(url: str):
    """Return (repo, rev, path) with query/fragment stripped from path."""
    m = re.match(r"^https://huggingface\.co/([^/]+/[^/]+)/resolve/([^/]+)/(.+)$", url)
    if not m:
        return None, None, None
    path = m.group(3)
    path = path.split("?", 1)[0].split("#", 1)[0]
    path = urllib.parse.unquote(path)
    return m.group(1), m.group(2), path


def widget_name(node: dict) -> dict[str, object]:
    named = node.get("widgets_values_named")
    if isinstance(named, dict):
        return named
    return {}


def widget_filename(node: dict, key: str, index: int):
    names = widget_name(node)
    if key in names and names[key] is not None:
        return names[key]
    vals = node.get("widgets_values") or []
    if index < len(vals):
        return vals[index]
    return None


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

    keys, want_dir = LOADERS[ntype]
    want_n = len(keys)
    entries = (node.get("properties") or {}).get("models")

    if not entries:
        fname0 = widget_filename(node, keys[0], 0)
        errs.append(f"node {nid} ({ntype}): properties.models missing (loads {fname0!r})")
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
        fname = widget_filename(node, keys[i], i) if i < len(keys) else None
        if name and fname and name != fname:
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
            infos.append(f"{tag}: pinned revision {rev!r}")
        if name and path.rsplit("/", 1)[-1] != name:
            errs.append(f"{tag}: url filename {path.rsplit('/', 1)[-1]!r} != name {name!r}")

        if remote is None:
            continue
        tree = remote.tree(repo, rev)
        if "__error__" in tree:
            errs.append(f"{tag}: cannot read repo {repo}@{rev}: {tree['__error__'][0]}")
            continue
        if path not in tree:
            errs.append(f"{tag}: {path} not found in {repo}@{rev}")
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
            keys, _want_dir = LOADERS[node["type"]]
            fname = widget_filename(node, keys[0], 0)
            entries = (node.get("properties") or {}).get("models")
            directory = None
            if isinstance(entries, list):
                for ent in entries:
                    if isinstance(ent, dict) and ent.get("directory") is not None:
                        directory = ent.get("directory")
                        break
            rows.append(
                (node.get("id"), node["type"], fname, directory, "ok" if not e else "FAIL")
            )
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
    else:
        print("\nRESULT:", "FAIL" if failed else "PASS", f"({len(a.workflows)} file(s))")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
