#!/usr/bin/env python3
"""Deterministic grid layout for a ComfyUI workflow JSON.

Why: hand-nudging positions after three rounds of "groups are not aligned /
notes are not on the left / the columns are ragged" wastes GPU-free hours.
This places every MarkdownNote in one leftmost column and then lays the groups
out on a uniform grid: each row uses fixed equal-width columns, groups in a row
share the same top and bottom, rows are separated by a fixed gap.

Layout rules encoded here (the user's):
  * notes in a single leftmost column;
  * every node in one column has the SAME width (group inner width) and is
    centred, so left/right margins match;
  * 70px between stacked nodes so an error banner never touches the next node;
  * groups in a row share top and bottom edges; rows share the same grid.

Usage:
    python3 layout_grid.py <workflow.json> <spec.json> [--write]

spec.json:
{
  "grid_x": 650,
  "note_x": 10, "note_w": 560, "note_gap": 40,
  "top": 100, "gap": 30, "col_gap": 30, "node_gap": 70, "inner_gap": 60,
  "margin": [70, 90, 70, 40],
  "rows": [
    {"groups": [["Loaders", 800], ["Prompts", 900], ["Model Patches", 900]]},
    {"groups": [["Control Maps", 800, 2], ["Sampling and Output", 1200, 2]]}
  ]
}

A third entry per group = number of internal columns (default 1). With 2 the
group's inner width is split in two equal columns separated by `inner_gap`;
members fill the first column top-to-bottom, then the second.

Group membership is read from each group's CURRENT bounding box, so run this
against a file whose groups still contain their nodes (fix membership first if
not). Column widths are explicit so every row can share one grid.
"""
import json
import sys


def rect_overlap(a, b):
    ox = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
    oy = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
    return ox > 0 and oy > 0


def members_of(w, g, placed):
    gx, gy, gw, gh = g["bounding"]
    out = []
    for n in w["nodes"]:
        if n["type"] == "MarkdownNote" or n["id"] in placed:
            continue
        x, y = n["pos"]
        if gx - 1 <= x < gx + gw and gy - 1 <= y < gy + gh:
            out.append(n)
    out.sort(key=lambda n: (n["pos"][1], n["pos"][0]))
    return out


def cap_size(node, width, node_gap):
    """Keep the stored height but never let a display node dwarf the column."""
    h = (node.get("size") or [width, 100])[1] or 100
    if node["type"] == "SaveImage":
        h = min(h, 520)
    if node["type"] == "ImageCompare":
        h = min(h, 560)
    return [width, h]


def main():
    path, spec_path = sys.argv[1], sys.argv[2]
    write = "--write" in sys.argv
    w = json.load(open(path))
    spec = json.load(open(spec_path))

    grid_x = spec.get("grid_x", 650)
    note_x = spec.get("note_x", 10)
    note_w = spec.get("note_w", 560)
    note_gap = spec.get("note_gap", 40)
    top = spec.get("top", 100)
    row_gap = spec.get("gap", 30)
    col_gap = spec.get("col_gap", 30)
    node_gap = spec.get("node_gap", 70)      # survives the error banner
    inner_gap = spec.get("inner_gap", 60)
    ml, mt, mr, mb = spec.get("margin", [70, 90, 70, 40])

    gmap = {g.get("title"): g for g in w.get("groups", [])}
    nodes = {n["id"]: n for n in w["nodes"]}

    # 1) notes: one leftmost column
    notes = [n for n in w["nodes"] if n["type"] == "MarkdownNote"]
    notes.sort(key=lambda n: (n["pos"][1], n["pos"][0]))
    y = top
    for n in notes:
        h = (n.get("size") or [note_w, 500])[1] or 500
        n["size"] = [note_w, h]
        n["pos"] = [note_x, y]
        y += h + note_gap

    # 2) groups on the grid
    placed = set()
    row_y = top
    for row in spec["rows"]:
        groups = [(g[0], g[1], (g[2] if len(g) > 2 else 1)) for g in row["groups"]]

        # first pass: column heights
        heights = []
        for title, colw, ncols in groups:
            g = gmap.get(title)
            members = members_of(w, g, placed) if g else []
            inner = (colw - ml - mr - (ncols - 1) * inner_gap) // ncols
            per_col = -(-len(members) // ncols) if members else 0
            h = mt + mb
            for n in members[:per_col]:
                nw = inner
                h += cap_size(n, nw, node_gap)[1] + node_gap
            heights.append(max((h - node_gap) if members else 220, 220))
        row_h = max(heights)

        col_x = grid_x
        for title, colw, ncols in groups:
            g = gmap.get(title)
            if g:
                members = members_of(w, g, placed)
                inner = (colw - ml - mr - (ncols - 1) * inner_gap) // ncols
                per_col = -(-len(members) // ncols) if members else 0
                for ci in range(ncols):
                    chunk = members[ci * per_col:(ci + 1) * per_col]
                    ny = row_y + mt
                    nx = col_x + ml + ci * (inner + inner_gap)
                    for n in chunk:
                        n["size"] = cap_size(n, inner, node_gap)
                        n["pos"] = [nx, ny]
                        ny += n["size"][1] + node_gap
                        placed.add(n["id"])
                g["bounding"] = [col_x, row_y, colw, row_h]
                if not g.get("color"):
                    g["color"] = "#3f789e"
            col_x += colw + col_gap
        row_y += row_h + row_gap

    # 3) report + assert
    unplaced = [n["id"] for n in w["nodes"]
                if n["type"] != "MarkdownNote" and n["id"] not in placed]
    for g in w.get("groups", []):
        print(f"group {g.get('title'):28s} bbox={g['bounding']} color={g.get('color')}")
    print("unplaced nodes (outside every group):", unplaced)

    ids = list(nodes)
    over = 0
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = nodes[ids[i]], nodes[ids[j]]
            ra = (a["pos"][0], a["pos"][1], a["size"][0], a["size"][1])
            rb = (b["pos"][0], b["pos"][1], b["size"][0], b["size"][1])
            if rect_overlap(ra, rb):
                over += 1
                print("  OVERLAP", a["id"], a["type"], b["id"], b["type"])
    print("overlaps:", over)

    # column widths must be uniform per x
    from collections import defaultdict
    cols = defaultdict(set)
    for n in w["nodes"]:
        if n["type"] != "MarkdownNote":
            cols[n["pos"][0]].add(n["size"][0])
    ragged = {x: sorted(v) for x, v in cols.items() if len(v) > 1}
    print("ragged columns:", ragged or "none")

    if write:
        json.dump(w, open(path, "w"), indent=2, ensure_ascii=False)
        print("wrote", path)
    elif over or ragged:
        sys.exit(1)


if __name__ == "__main__":
    main()
