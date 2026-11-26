#!/usr/bin/env python3
"""Slot-index checks for ComfyUI workflow JSON.

Mirrors frontend ``zSlotIndex`` in
``ComfyUI_frontend/packages/graph-model/src/workflowSchema.ts``:

    z.union([
      z.number().int(),
      z.string().transform((v) => parseInt(v)).refine((v) => !isNaN(v))
    ])

``slot_index`` on node inputs and outputs is ``zSlotIndex.optional()`` with
no ``.nullable()``. A stored null fails ``validateComfyWorkflow``. Omit the
key and the slot index is taken from the array position.

Link slots are required: tuple indexes 2 and 4, or ``origin_slot`` and
``target_slot`` on ``zComfyLinkObject``.

These are the same rules as PR #1458 (``validate_templates.py`` on
``fix/validator-slot-index-null``), including every case that PR tests.
#1458's string check is a regex that still accepts two values ``parseInt``
rejects (``"0xG"`` and Unicode digits). This module follows ``parseInt``
on those edges so it is not looser than the frontend. After #1458 merges,
delete its local helpers and import this module.

Importing today's ``validate_templates._is_slot_index`` would not do: it
still treats bool as an int, rejects integral floats, and uses ``int()``
instead of ``parseInt``. Pointing the template validator at this module in
the same PR would also fail template CI on the workflows #1457 fixes.
"""

from __future__ import annotations

_ASCII_DIGIT = frozenset("0123456789")
_HEX_DIGIT = frozenset("0123456789abcdefABCDEF")
_MAX_SUBGRAPH_DEPTH = 32


def _parse_int_string(value: str) -> bool:
    """True when ECMAScript ``parseInt(value)`` is not NaN.

    ``parseInt`` skips leading whitespace, an optional sign, then either a
    ``0x`` hex prefix (at least one hex digit) or decimal digits. It stops at
    the first non-digit, so ``"3.7"`` and ``"3abc"`` are valid. It does not
    accept Unicode digits, and ``"0xG"`` is NaN because the hex prefix is
    selected and then no hex digit follows.
    """
    text = value.lstrip()
    if text[:1] in "+-":
        text = text[1:]
    if len(text) >= 2 and text[0] == "0" and text[1] in "xX":
        return len(text) >= 3 and text[2] in _HEX_DIGIT
    return bool(text) and text[0] in _ASCII_DIGIT


def is_slot_index(value) -> bool:
    """Return True when ``value`` satisfies frontend ``zSlotIndex``."""
    # bool is an int subclass; z.number() rejects it.
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return value.is_integer()  # z.number().int()
    if isinstance(value, str):
        return _parse_int_string(value)
    return False


def _node_slot_error(value, path: str) -> str:
    return (
        f"{path}.slot_index: expected int or parseable string, got "
        f"{type(value).__name__} (omit the key instead of null)"
    )


def _check_node_slots(node, path: str, errors: list[str]) -> None:
    if not isinstance(node, dict):
        return
    for kind in ("inputs", "outputs"):
        slots = node.get(kind)
        if not isinstance(slots, list):
            continue
        for index, slot in enumerate(slots):
            if not isinstance(slot, dict) or "slot_index" not in slot:
                continue
            value = slot["slot_index"]
            if not is_slot_index(value):
                errors.append(_node_slot_error(value, f"{path}.{kind}[{index}]"))


def _check_links(links, path: str, errors: list[str]) -> None:
    """Check tuple links and ``zComfyLinkObject`` links."""
    if not isinstance(links, list):
        errors.append(f"{path}: expected array")
        return
    for index, link in enumerate(links):
        link_path = f"{path}[{index}]"
        if isinstance(link, dict):
            for key in ("origin_slot", "target_slot"):
                if not is_slot_index(link.get(key)):
                    errors.append(
                        f"{link_path}.{key}: expected int or parseInt-able string"
                    )
            continue
        if isinstance(link, list):
            src = link[2] if len(link) > 2 else None
            dst = link[4] if len(link) > 4 else None
            if len(link) <= 2 or not is_slot_index(src):
                errors.append(
                    f"{link_path}[2] (src_slot): expected int or parseable string"
                )
            if len(link) <= 4 or not is_slot_index(dst):
                errors.append(
                    f"{link_path}[4] (dst_slot): expected int or parseable string"
                )
            continue
        errors.append(
            f"{link_path}: expected link tuple or object, got {type(link).__name__}"
        )


def _walk(data, prefix: str, errors: list[str], *, top: bool, depth: int) -> None:
    if not isinstance(data, dict):
        return
    if depth > _MAX_SUBGRAPH_DEPTH:
        errors.append(f"{prefix}: subgraph nesting exceeds {_MAX_SUBGRAPH_DEPTH}")
        return

    nodes = data.get("nodes")
    if isinstance(nodes, list):
        node_base = f"{prefix}: nodes" if top else f"{prefix}.nodes"
        for index, node in enumerate(nodes):
            _check_node_slots(node, f"{node_base}[{index}]", errors)

    links = data.get("links")
    if links is not None:
        link_path = f"{prefix}: links" if top else f"{prefix}.links"
        _check_links(links, link_path, errors)

    definitions = data.get("definitions") or {}
    if not isinstance(definitions, dict):
        return
    subgraphs = definitions.get("subgraphs") or []
    if not isinstance(subgraphs, list):
        return
    for index, subgraph in enumerate(subgraphs):
        if not isinstance(subgraph, dict):
            continue
        subgraph_id = subgraph.get("id", f"subgraph-{index}")
        if top:
            child = f"{prefix}: definitions.subgraphs[{subgraph_id}]"
        else:
            child = f"{prefix}.definitions.subgraphs[{subgraph_id}]"
        _walk(subgraph, child, errors, top=False, depth=depth + 1)


def validate_workflow_slot_indexes(data: dict, name: str) -> list[str]:
    """Return slot_index errors for one workflow or blueprint document.

    Walks top-level nodes and links, then ``definitions.subgraphs`` (nested
    definitions included) for node input/output ``slot_index`` values and for
    links in both the tuple form and the ``zComfyLinkObject`` form.
    """
    errors: list[str] = []
    _walk(data, name, errors, top=True, depth=0)
    return errors
