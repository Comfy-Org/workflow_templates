#!/usr/bin/env python3
"""Colour-restraint checker for ComfyUI UI-format workflows.

Shipped templates spend colour as a spotlight, not a legend: every group keeps the
default frame, at most one core group is red, notes are black, and node accents are
off unless the graph is genuinely complex. This script reports the places where a
graph spends colour without earning it.

Rules it enforces (see references/layout-and-groups.md -> Colors):

  hard (exit 1)
    * a Note / MarkdownNote that is not black `#222` / `#000`
      (yellow is what the frontend paints `api_node`s with — a yellow note reads as
      a partner node)
    * more than one red group frame (`#A88`)
    * more than one accent colour among group frames
    * more than one red hero node pair (`#322` / `#533`)
    * a hex value that is not in `LGraphCanvas.node_colors`

  soft (exit 0, exit 1 with --strict)
    * a single decorative group accent (green / blue / cyan / purple / brown / yellow)
    * a single red hero node (confirm the graph earns the spotlight)
    * coloured non-note nodes (list of types, so you can tell a hero node from clutter)
    * yellow `#432` / `#653` on a non-note node: correct for a partner/API node, wrong
      as an accent on a local one — confirm by node type (manual review; do not strip API defaults)

Usage:  python3 check_wf_colors.py a.json [b.json ...] [--strict]
        python3 check_wf_colors.py templates/            # every *.json inside
Exit code 1 when a workflow breaks a hard rule.
"""
from __future__ import annotations

import glob
import json
import os
import sys

# name -> (node color, node bgcolor, groupcolor), from LGraphCanvas.node_colors
PALETTE: dict[str, tuple[str, str, str]] = {
    "red": ("#322", "#533", "#A88"),
    "brown": ("#332922", "#593930", "#b06634"),
    "green": ("#232", "#353", "#8A8"),
    "blue": ("#223", "#335", "#88A"),
    "pale_blue": ("#2a363b", "#3f5159", "#3f789e"),
    "cyan": ("#233", "#355", "#8AA"),
    "purple": ("#323", "#535", "#a1309b"),
    "yellow": ("#432", "#653", "#b58b2a"),
    "black": ("#222", "#000", "#444"),
}
NOTE_PAIR = ("#222", "#000")          # notes ship black
API_PAIR = ("#432", "#653")           # the pair the frontend gives api_node
HERO_PAIR = ("#322", "#533")          # the only node accent allowed, one per graph
RED_GROUP = "#A88"
# no `color` key -> LiteGraph falls back to #335; #3f789e is what a new group gets;
# #444 is the black palette's frame
NEUTRAL_GROUPS: set[str | None] = {None, "", "#335", "#3f789e", "#444"}

NOTE_TYPES = {"Note", "MarkdownNote"}


def pair_name(color: str | None, bgcolor: str | None) -> str | None:
    for name, (c, b, _g) in PALETTE.items():
        if color == c and bgcolor == b:
            return name
    return None


def graph_color_name(value: str) -> str | None:
    for name, (_c, _b, g) in PALETTE.items():
        if value == g:
            return name
    return None


def walk_graphs(data: object, path: str) -> list[tuple[str, dict]]:
    """Yield (label, graph) for the top-level workflow and every subgraph."""
    out: list[tuple[str, dict]] = []
    if not isinstance(data, dict):
        return out
    out.append((path, data))
    defs = data.get("definitions") or {}
    for sg in (defs.get("subgraphs") or []):
        if isinstance(sg, dict):
            out.append((f"{path}#{sg.get('id', 'subgraph')}", sg))
            out.extend(walk_graphs(sg, f"{path}#{sg.get('id', 'subgraph')}")[1:])
    return out


def check_graph(label: str, graph: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    nodes = [n for n in (graph.get("nodes") or []) if isinstance(n, dict)]
    groups = [g for g in (graph.get("groups") or []) if isinstance(g, dict)]

    # --- notes -------------------------------------------------------------
    for n in nodes:
        if n.get("type") not in NOTE_TYPES:
            continue
        pair = (n.get("color"), n.get("bgcolor"))
        if pair == NOTE_PAIR:
            continue
        name = pair_name(*pair) or "no colour set"
        extra = " (yellow is the api_node pair)" if pair == API_PAIR else ""
        errors.append(
            f"note node {n.get('id')} {n.get('title')!r} is {name}{extra} — "
            'notes ship color "#222" / bgcolor "#000"'
        )

    # --- group frames ------------------------------------------------------
    accents: dict[str, list[object]] = {}
    for g in groups:
        color = g.get("color")
        if color not in NEUTRAL_GROUPS:
            key = str(color)
            accents.setdefault(key, []).append(g.get("id"))
            if graph_color_name(key) is None:
                errors.append(
                    f"group {g.get('id')} {g.get('title')!r} uses {key!r}, "
                    "which is not a palette group colour"
                )
    if len(accents) > 1:
        detail = ", ".join(f"{c} (group ids {ids})" for c, ids in accents.items())
        errors.append(f"{len(accents)} group accent colours: {detail} — one per graph at most")
    elif len(accents) == 1:
        color, ids = next(iter(accents.items()))
        if color != RED_GROUP:
            warnings.append(
                f"group frame {color} (group ids {ids}) is a decorative accent — "
                f"the only group accent is red {RED_GROUP} for the core group"
            )
    red_groups = [g.get("id") for g in groups if g.get("color") == RED_GROUP]
    if len(red_groups) > 1:
        errors.append(f"{len(red_groups)} red group frames (ids {red_groups}) — at most one core group")

    # --- node accents ------------------------------------------------------
    def coloured() -> list[dict]:
        return [
            n for n in nodes
            if n.get("type") not in NOTE_TYPES and (n.get("color") or n.get("bgcolor"))
        ]

    painted = coloured()
    heroes = [n for n in painted if (n.get("color"), n.get("bgcolor")) == HERO_PAIR]
    if len(heroes) > 1:
        types = [f"{n.get('id')}:{n.get('type')}" for n in heroes]
        errors.append(f"{len(heroes)} red hero nodes ({', '.join(types)}) — one at most")
    elif len(heroes) == 1:
        h = heroes[0]
        warnings.append(
            f"1 red hero node ({h.get('id')}:{h.get('type')}) — "
            "confirm the graph earns a spotlight"
        )

    api_yellow = [n for n in painted if (n.get("color"), n.get("bgcolor")) == API_PAIR]
    if api_yellow:
        yellow_by_type: dict[str, int] = {}
        for n in api_yellow:
            t = str(n.get("type"))
            yellow_by_type[t] = yellow_by_type.get(t, 0) + 1
        detail = ", ".join(f"{t} x{c}" for t, c in yellow_by_type.items())
        warnings.append(
            f"{len(api_yellow)} node(s) keep the api_node yellow #432/#653: {detail} — "
            "expected for partner/API nodes, wrong as an accent on a local node"
        )

    other = [n for n in painted if n not in heroes and n not in api_yellow]
    if other:
        other_by_type: dict[str, int] = {}
        for n in other:
            t = str(n.get("type"))
            other_by_type[t] = other_by_type.get(t, 0) + 1
        detail = ", ".join(f"{t} x{c}" for t, c in other_by_type.items())
        warnings.append(f"{len(other)} node(s) carry an accent colour: {detail}")

    for n in painted:
        pair = (n.get("color"), n.get("bgcolor"))
        if pair_name(*pair) is None:
            errors.append(
                f"node {n.get('id')} {n.get('type')} uses {pair[0]}/{pair[1]}, "
                "which is not a palette pair"
            )

    return ([f"{label}: {e}" for e in errors], [f"{label}: {w}" for w in warnings])


def check_path(path: str) -> tuple[list[str], list[str]]:
    data = json.load(open(path))
    errors: list[str] = []
    warnings: list[str] = []
    graphs = walk_graphs(data, path)
    if not graphs:
        return ([f"{path}: not a UI-format workflow (expected an object with nodes/links)"], [])
    for label, graph in graphs:
        e, w = check_graph(label, graph)
        errors += e
        warnings += w
    return errors, warnings


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    targets = [a for a in argv if not a.startswith("--")]
    if not targets:
        print(__doc__)
        return 2

    paths: list[str] = []
    for t in targets:
        if os.path.isdir(t):
            paths += sorted(glob.glob(os.path.join(t, "*.json")))
        else:
            paths.append(t)

    total_e = total_w = 0
    for path in paths:
        try:
            errors, warnings = check_path(path)
        except json.JSONDecodeError as exc:
            errors, warnings = ([f"{path}: not valid JSON ({exc})"], [])
        total_e += len(errors)
        total_w += len(warnings)
        status = "FAIL" if errors else ("WARN" if warnings else "OK")
        print(f"{path}: {status}")
        for line in errors + warnings:
            print(f"  - {line}")

    print(f"\n{len(paths)} workflow(s): {total_e} error(s), {total_w} warning(s)")
    return 1 if total_e or (strict and total_w) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
