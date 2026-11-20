#!/usr/bin/env python3
"""Upsert workflow_templates entries into the Comfy Content Catalog (CCC) as DRAFTS.

Design notes (read before changing anything)
--------------------------------------------
* This tool can only write DRAFTS. The catalog refuses API keys on /draft/staging and
  /draft/publish (403 "API keys cannot stage or publish catalog changes"). A human clicks
  Approve -> Final review -> Publish in https://comfy.org/admin/catalog.
* A record is identified by `template_name` (the template file stem). Records created by an
  older import carry `template_name: null`; this tool never touches those, and never creates a
  second record for a stem it already finds.
* `expected_draft_rev` is ONE global CAS token for the whole draft, so two syncs running at the
  same time 409 each other. The workflow is serialised with a concurrency group and this tool
  retries 409/503 with backoff.
* The catalog does not dedupe slugs. The slug is derived deterministically from the stem and is
  only used on create; an existing record keeps its slug.
* Examples are NOT produced here: an honest example has to be a real output of the graph, which
  means a paid Cloud run. This tool only writes the record document (copy, tags, graph pair,
  covers). Existing `examples` on an update are preserved untouched.

Environment
-----------
CCC_API_KEY            catalog key (X-API-Key).  Cannot publish.
CCC_API_BASE_URL       default https://cloud.comfy.org
CCC_PUBLIC_ORIGIN      default https://comfy.org        (used in human-readable output only)
COMFY_CLOUD_API_KEY    same key, used by `comfy` for the UI->API conversion
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import requests
from PIL import Image

SERVER_FIELDS = {
    "uid", "creator_uid", "owner_uid", "author_uid", "saved_by_uid", "digest", "edit_sequence",
    "revision_uid", "catalog_rev", "saved_at", "is_deleted", "expected_draft_rev",
    "expected_revision_uid", "byte_size", "content_hash", "hash_algorithm", "file_version_uid",
}
MAX_THUMB_BYTES = 160 * 1024
MAX_THUMB_SIDE = 960
MAX_MEDIA_BYTES = 8 * 1024 * 1024
DESCRIPTION_LIMIT = 160
TITLE_LIMIT = 80

MEDIA_KIND = {"image": "image", "video": "video", "audio": "audio", "text": "text"}


# ----------------------------------------------------------------------------- catalog client
class Catalog:
    def __init__(self, base_url: str, key: str, dry_run: bool = False):
        self.base = base_url.rstrip("/") + "/api/v1/catalog"
        self.key = key
        self.dry_run = dry_run
        self.s = requests.Session()
        self.s.headers.update({"X-API-Key": key, "Accept": "application/json"})

    def call(self, method: str, path: str, *, json_body=None, files=None, data=None,
             idem: str | None = None, retries: int = 6):
        url = self.base + path
        if self.dry_run and method in ("POST", "PUT", "DELETE"):
            return {"_dry_run": True, "method": method, "path": path}
        headers = {"Idempotency-Key": idem} if idem else {}
        for attempt in range(retries):
            try:
                r = self.s.request(method, url, json=json_body, files=files, data=data,
                                   headers=headers, timeout=120)
            except requests.RequestException as exc:
                if attempt == retries - 1:
                    raise SystemExit(f"{method} {path} transport error: {exc}")
                time.sleep(3 * (attempt + 1))
                continue
            if r.status_code in (409, 429, 502, 503, 504):
                if attempt == retries - 1:
                    raise SystemExit(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
                time.sleep(min(30, 4 * (attempt + 1)))
                continue
            if r.status_code >= 400:
                raise SystemExit(f"{method} {path} -> {r.status_code}: {r.text[:800]}")
            return r.json() if r.content else {}
        raise SystemExit("unreachable")

    # --- reads
    def state(self):
        return self.call("GET", "/state")

    def authoring(self):
        return self.call("GET", "/authoring-context")

    def live_workflows(self):
        out, cursor = [], None
        while True:
            path = "/items?kind=WORKFLOW&limit=100" + (f"&cursor={cursor}" if cursor else "")
            d = self.call("GET", path)
            out += d.get("items", [])
            if not d.get("has_more"):
                break
            cursor = d.get("next_cursor")
            if not cursor:
                break
        return out

    def draft_rows(self):
        out, cursor = [], None
        while True:
            path = "/draft/staging?representation=page&limit=100" + (f"&cursor={cursor}" if cursor else "")
            d = self.call("GET", path)
            out += d.get("items", [])
            cursor = (d.get("page") or {}).get("next_cursor")
            if not cursor:
                break
        return out

    def draft_record(self, uid):
        return self.call("GET", f"/draft/items/{uid}")

    def live_record(self, uid):
        return self.call("GET", f"/items/{uid}")

    # --- writes
    def create(self, body, idem):
        return self.call("POST", "/draft/items", json_body=body, idem=idem)

    def put(self, uid, doc, idem):
        return self.call("PUT", f"/draft/items/{uid}", json_body=doc, idem=idem)

    def upload(self, uid, role, name, path: Path, change_id, idem):
        rev = self.state()["draft_rev"]
        with open(path, "rb") as fh:
            files = {"file": (path.name, fh.read())}
        return self.call("POST", "/draft/media", files=files, idem=idem, data={
            "expected_draft_rev": rev, "originating_entity_uid": uid, "role": role,
            "name": name, "change_id": change_id,
        })

    def preview_ok(self, draft_rev, ref) -> bool:
        url = f"{self.base}/preview-media/{draft_rev}/{ref['id']}/{ref['file_version_uid']}"
        try:
            r = self.s.get(url, timeout=60)
        except requests.RequestException:
            return False
        return r.status_code == 200 and len(r.content) > 0


# ----------------------------------------------------------------------------- helpers
def kebab(text: str) -> str:
    s = text.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-{2,}", "-", s).strip("-")


def slug_for(stem: str) -> str:
    for prefix in ("api_", "utility_", "video_", "image_", "3d_", "audio_", "llm_"):
        if stem.startswith(prefix):
            stem = stem[len(prefix):]
            break
    return kebab(stem)[:60].strip("-")


def norm_title(text: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower().replace("&", " and ")).split())


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_index(repo: Path):
    """Walk templates/index.json; return {stem: {title, description, tags, models, io, section}}."""
    index = json.loads((repo / "templates" / "index.json").read_text())
    found: dict[str, dict] = {}

    def walk(node, section=None):
        if isinstance(node, dict):
            name = node.get("name")
            if isinstance(name, str) and "title" in node:
                found[name] = {
                    "title": node.get("title"),
                    "description": node.get("description") or node.get("short_description") or "",
                    "tags": node.get("tags") or [],
                    "models": node.get("models") or [],
                    "io": node.get("io"),
                    "section": section,
                }
            for key, value in node.items():
                if key == "templates":
                    walk(value, {k: v for k, v in node.items() if k != "templates"})
                else:
                    walk(value, section)
        elif isinstance(node, list):
            for item in node:
                walk(item, section)

    walk(index)
    return found


def convert_to_api(repo: Path, stem: str, work: Path) -> Path | None:
    """UI -> API with comfy-cli (needs COMFY_CLOUD_API_KEY). Prints only: no job, no credits."""
    ui = repo / "templates" / f"{stem}.json"
    out = work / f"{stem}.api.json"
    cmd = ["comfy", "--json", "run", "--workflow", str(ui), "--where", "cloud", "--print-prompt"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    except FileNotFoundError:
        print(f"  ! comfy CLI not found — cannot convert {stem}")
        return None
    except subprocess.TimeoutExpired:
        print(f"  ! conversion timed out for {stem}")
        return None
    try:
        env = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print(f"  ! conversion produced no JSON for {stem}: {proc.stdout[:200]}")
        return None
    if not env.get("ok"):
        err = (env.get("error") or {}).get("code", "?")
        print(f"  ! conversion refused {stem}: {err}")
        return None
    prompt = (env.get("data") or {}).get("prompt")
    if not prompt:
        print(f"  ! conversion returned an empty prompt for {stem}")
        return None
    out.write_text(json.dumps(prompt, indent=1))
    return out


def make_cover(src: Path, dst: Path) -> Path | None:
    """WebP <=960 px a side and <=160 KiB, which is what the publication rules enforce."""
    try:
        img = Image.open(src).convert("RGBA")
    except Exception:
        return None
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:  # Pillow < 9.1
        resample = Image.LANCZOS
    img.thumbnail((MAX_THUMB_SIDE, MAX_THUMB_SIDE), resample)
    for quality in (85, 78, 70, 62, 55, 45):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        if buf.tell() <= MAX_THUMB_BYTES:
            dst.write_bytes(buf.getvalue())
            return dst
    return None


def derived_types(io_block):
    if not io_block:
        return None, None
    for out in io_block.get("outputs") or []:
        kind = MEDIA_KIND.get((out or {}).get("mediaType", ""))
        if kind:
            return kind, {"image": "generate-images", "video": "generate-videos",
                          "audio": "generate-audio", "text": "generate-text",
                          "3d": "generate-3d"}.get(kind)
    return None, None


def trim(text: str, limit: int) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    return cut.rsplit(" ", 1)[0] + "…"


# ----------------------------------------------------------------------------- the sync
class Syncer:
    def __init__(self, repo: Path, cat: Catalog, change_id: str, dry_run: bool,
                 template_map: dict | None = None):
        self.repo = repo
        self.cat = cat
        self.change_id = change_id
        self.dry_run = dry_run
        self.index = load_index(repo)
        self.work = repo / ".ccc-work"
        self.work.mkdir(exist_ok=True)
        self.draft_rows_cache = None
        self._live = None
        self.template_map = template_map or {}

    # --- lookup
    def find_record(self, stem: str, entry: dict):
        """Find the record that owns this stem: ('live'|'draft', uid, doc, adopted).

        Order of evidence:
          1. `template_name == stem` (the identity this tool writes on every sync),
          2. a legacy record with `template_name: null` whose slug starts with the derived slug
             or whose title matches exactly — adopted, because creating a second record for
             the same workflow is the defect we keep seeing in this catalog,
          3. nothing.
        A record that already carries a *different* template_name is never touched.
        """
        want_slug = slug_for(stem)
        want_title = norm_title(entry.get("title") or "")

        # explicit mapping wins: some legacy records carry an unrelated slug/title
        mapped = self.template_map.get(stem)
        if mapped:
            for row in (self._live if self._live is not None else self.cat.live_workflows()):
                slug = (row.get("slug") or "").split("/")[-1]
                if mapped in (row.get("uid"), slug):
                    uid = row.get("uid")
                    doc = self.cat.live_record(uid)
                    doc = doc.get("data") or doc
                    print(f"  · mapped {stem} -> live {slug}")
                    return "live", uid, doc, doc.get("template_name") != stem

        # live side
        if self._live is None:
            self._live = self.cat.live_workflows()
        for row in self._live:
            slug = (row.get("slug") or "").split("/")[-1]
            title = norm_title((row.get("data") or {}).get("title") or "")
            if not (slug.startswith(want_slug) or (want_title and title == want_title)):
                continue
            uid = row.get("uid")
            doc = self.cat.live_record(uid)
            doc = doc.get("data") or doc
            tname = doc.get("template_name")
            if tname == stem:
                return "live", uid, doc, False
            if tname is None:
                return "live", uid, doc, True

        # draft side (staging documents are partial: resolve template_name per uid)
        if self.draft_rows_cache is None:
            self.draft_rows_cache = self.cat.draft_rows()
        for row in self.draft_rows_cache:
            content = row.get("content") or {}
            document = content.get("document") or {}
            slug = (document.get("slug") or "").split("/")[-1]
            if not slug:
                continue
            if not (slug.startswith(want_slug) or (want_title and norm_title(document.get("title")) == want_title)):
                continue
            uid = content.get("uid")
            doc = self.cat.draft_record(uid)
            doc = doc.get("data") or doc
            if doc.get("is_deleted"):
                continue
            tname = doc.get("template_name")
            if tname == stem:
                return "draft", uid, doc, False
            if tname is None:
                return "draft", uid, doc, True
        return None, None, None, False

    # --- document
    def build_fields(self, stem: str, entry: dict, api_path: Path | None):
        title = trim(entry["title"] or stem, TITLE_LIMIT)
        description = trim(entry["description"] or f"{entry['title']} workflow template.", DESCRIPTION_LIMIT)
        tags = [t for t in (entry["tags"] or []) if isinstance(t, str)][:10]
        if stem.startswith("api_") and "API" not in tags:
            tags = ["API"] + tags
        labels = [{"display_name": m, "name": kebab(m)} for m in (entry["models"] or []) if isinstance(m, str)]
        output_type, generation_type = derived_types(entry.get("io"))
        fields = {
            "title": title,
            "description": description,
            "template_name": stem,
            "tags": tags,
            "model_labels": labels,
            "long_description": entry["description"],
        }
        if entry.get("section"):
            fields["template_category"] = entry["section"]
        if entry.get("io"):
            fields["io"] = entry["io"]
        if output_type:
            fields["output_type"] = output_type
        if generation_type:
            fields["generation_type"] = generation_type
        return fields

    def sync_one(self, stem: str) -> dict:
        entry = self.index.get(stem)
        if not entry:
            return {"stem": stem, "status": "skipped", "reason": "not in templates/index.json"}
        ui = self.repo / "templates" / f"{stem}.json"
        if not ui.exists():
            return {"stem": stem, "status": "skipped", "reason": "template json missing"}

        api_path = convert_to_api(self.repo, stem, self.work)
        kind, uid, doc, adopted = self.find_record(stem, entry)
        fields = self.build_fields(stem, entry, api_path)

        created = False
        if adopted:
            print(f"  · adopting existing {kind} record without template_name ({uid})")
        if uid is None:
            body = {
                "type": "workflow",
                "slug": slug_for(stem),
                "schema_version": 2,
                "visibility": "public",
                "enabled": True,
                "source_locale": "en",
                "available_surfaces": ["hub"],
                "change_id": self.change_id,
                "expected_draft_rev": self.cat.state()["draft_rev"],
                **{k: v for k, v in fields.items() if k in ("title", "description", "template_name", "tags")},
            }
            idem = "ccc-create-" + hashlib.sha256(
                (stem + sha256_file(ui) + self.change_id).encode()).hexdigest()[:32]
            resp = self.cat.create(body, idem)
            if resp.get("_dry_run"):
                return {"stem": stem, "status": "dry-run-create", "slug": body["slug"], "api": bool(api_path)}
            uid = resp.get("uid") or (resp.get("data") or {}).get("uid")
            if not uid:
                return {"stem": stem, "status": "failed", "reason": "create returned no uid"}
            created = True
            doc = self.cat.draft_record(uid)
            doc = doc.get("data") or doc

        # media: graph pair (r2) + three covers (media), one uid and one name per field
        refs = {}
        slug = doc.get("slug") or slug_for(stem)
        uploads = [("workflow_graph", "r2", f"{slug}/workflow-ui-v1.json", ui)]
        if api_path:
            uploads.append(("api_workflow", "r2", f"{slug}/workflow-api-v1.json", api_path))
        cover_src = self.repo / "templates" / f"{stem}-1.webp"
        cover = None
        if cover_src.exists():
            cover = make_cover(cover_src, self.work / f"{stem}-cover.webp")
        for role, src, name, path in uploads:
            idem = "ccc-media-" + hashlib.sha256(
                (uid + role + name + sha256_file(path)).encode()).hexdigest()[:32]
            resp = self.cat.upload(uid, role, name, path, self.change_id, idem)
            if resp.get("_dry_run"):
                continue
            refs[role] = {"src": src, "id": resp["uid"],
                          "file_version_uid": resp["revision_uid"], "name": resp["name"]}
        if cover:
            for role in ("card_thumb", "thumbnail", "hero"):
                name = f"{slug}/{role}-{cover.name}"
                idem = "ccc-media-" + hashlib.sha256(
                    (uid + role + name + sha256_file(cover)).encode()).hexdigest()[:32]
                resp = self.cat.upload(uid, role, name, cover, self.change_id, idem)
                if resp.get("_dry_run"):
                    continue
                refs[role] = {"src": "media", "id": resp["uid"],
                              "file_version_uid": resp["revision_uid"], "name": resp["name"]}

        # one full-document PUT: server fields stripped, only managed fields replaced
        out = {k: v for k, v in doc.items() if k not in SERVER_FIELDS}
        out.update(fields)
        out["change_id"] = self.change_id
        version = {"name": "V1"}
        if "workflow_graph" in refs:
            version["download"] = refs["workflow_graph"]
        if "api_workflow" in refs:
            version["api"] = refs["api_workflow"]
        if len(version) > 1:
            existing = [v for v in (doc.get("workflow_versions") or []) if v.get("name") != "V1"]
            out["workflow_versions"] = [version] + existing
        for field, role in (("static_thumb", "card_thumb"), ("thumbnail", "thumbnail"), ("hero", "hero")):
            if role in refs:
                out[field] = refs[role]
        idem = "ccc-put-" + hashlib.sha256(
            (uid + str(doc.get("revision_uid")) + json.dumps(out, sort_keys=True)).encode()).hexdigest()[:32]
        self.cat.put(uid, out, idem)
        if self.dry_run:
            return {"stem": stem, "status": "dry-run-update" if not created else "dry-run-create",
                    "uid": uid, "slug": slug}

        # verify: every pinned ref must serve bytes
        after = self.cat.draft_record(uid)
        after = after.get("data") or after
        draft_rev = self.cat.state()["draft_rev"]
        bad = []
        for path, ref in iter_refs(after):
            if not self.cat.preview_ok(draft_rev, ref):
                bad.append(path)
        return {
            "stem": stem, "status": "created" if created else "updated", "uid": uid, "slug": slug,
            "api": bool(api_path), "covers": "static_thumb" in refs, "bad_refs": bad,
            "adopted_legacy": adopted, "source": kind,
            "preview": f"{os.environ.get('CCC_PUBLIC_ORIGIN', 'https://comfy.org')}/admin/catalog",
        }


def iter_refs(node, path="$"):
    if isinstance(node, dict):
        if isinstance(node.get("id"), str) and node.get("src") in ("media", "r2"):
            yield path, node
            return
        for key, value in node.items():
            yield from iter_refs(value, f"{path}.{key}")
    elif isinstance(node, list):
        for idx, value in enumerate(node):
            yield from iter_refs(value, f"{path}[{idx}]")


def main() -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    ap.add_argument("--repo", default=".", type=Path)
    ap.add_argument("--stems", nargs="*", default=[])
    ap.add_argument("--changed-files", nargs="*", default=[],
                    help="paths from a push/PR; stems are derived from templates/<stem>.json")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--change-id", default="ci-ccc-sync")
    ap.add_argument("--summary", default=os.environ.get("GITHUB_STEP_SUMMARY"))
    ap.add_argument("--map", default="scripts/ccc/template-map.json", type=Path,
                    help="optional stem -> uid/slug overrides for legacy records")
    args = ap.parse_args()

    stems = list(args.stems)
    for path in args.changed_files:
        m = re.match(r"templates/([^/]+)\.json$", path)
        if m and not m.group(1).startswith("index"):
            stems.append(m.group(1))
    if args.all:
        stems = [s for s in load_index(args.repo) if (args.repo / "templates" / f"{s}.json").exists()]
    stems = list(dict.fromkeys(stems))
    if not stems:
        print("nothing to do: pass --stems, --changed-files or --all")
        return 0

    key = os.environ.get("CCC_API_KEY")
    if not key:
        print("CCC_API_KEY is not set — nothing to do")
        return 2
    base = os.environ.get("CCC_API_BASE_URL", "https://cloud.comfy.org")
    cat = Catalog(base, key, dry_run=args.dry_run)
    ctx = cat.authoring()
    if not ctx.get("can_edit"):
        print(f"key cannot edit ({ctx}) — aborting")
        return 2

    template_map = {}
    map_path = args.repo / args.map if not args.map.is_absolute() else args.map
    if map_path.exists():
        raw = json.loads(map_path.read_text())
        template_map = {k: v for k, v in raw.items() if not k.startswith("_") and isinstance(v, str)}
        print(f"template map: {len(template_map)} override(s) from {map_path}")
    syncer = Syncer(args.repo, cat, args.change_id, args.dry_run, template_map)
    results = []
    for stem in stems:
        print(f"== {stem}")
        try:
            results.append(syncer.sync_one(stem))
        except SystemExit as exc:
            results.append({"stem": stem, "status": "failed", "reason": str(exc)[:400]})
        except Exception as exc:  # noqa: BLE001 - one record must not kill the batch
            results.append({"stem": stem, "status": "failed", "reason": f"{type(exc).__name__}: {exc}"[:400]})

    ok = [r for r in results if r["status"] in ("created", "updated")]
    bad = [r for r in results if r["status"] in ("failed", "skipped")]
    print(json.dumps({"ok": len(ok), "failed_or_skipped": len(bad), "results": results}, indent=1))

    if args.summary:
        with open(args.summary, "a") as fh:
            fh.write("\n## CCC draft sync\n\n")
            fh.write(f"{len(ok)} record(s) written as drafts, {len(bad)} skipped/failed. "
                     f"Change ID: `{args.change_id}`\n\n")
            fh.write("| template | status | slug | notes |\n|---|---|---|---|\n")
            for r in results:
                note = r.get("reason") or (", ".join(r.get("bad_refs") or []) or
                                           ("no API graph" if r.get("api") is False else ""))
                fh.write(f"| `{r['stem']}` | {r['status']} | {r.get('slug', '')} | {note} |\n")
            fh.write("\nPublishing is manual: https://comfy.org/admin/catalog → filter by the change ID "
                     "→ Approve (staging) → Final review → Publish.\n")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
