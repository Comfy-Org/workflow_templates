"""JSON dump helpers — pretty objects, primitive arrays on one line."""

from __future__ import annotations

import json
from typing import Any

_PRIMITIVE_TYPES = (str, int, float, bool, type(None))


def _format_json(value: Any, indent: int, level: int) -> str:
    pad = " " * (indent * level)
    child_pad = " " * (indent * (level + 1))

    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)

    if isinstance(value, list):
        if not value:
            return "[]"
        if all(isinstance(item, _PRIMITIVE_TYPES) for item in value):
            inner = ", ".join(_format_json(item, indent, level + 1) for item in value)
            return f"[{inner}]"
        lines = [f"{child_pad}{_format_json(item, indent, level + 1)}" for item in value]
        return "[\n" + ",\n".join(lines) + f"\n{pad}]"

    if isinstance(value, dict):
        if not value:
            return "{}"
        lines = [
            f"{child_pad}{json.dumps(key, ensure_ascii=False)}: "
            f"{_format_json(item, indent, level + 1)}"
            for key, item in value.items()
        ]
        return "{\n" + ",\n".join(lines) + f"\n{pad}}}"

    return json.dumps(value, ensure_ascii=False)


def dumps_compact_arrays(data: Any, *, indent: int = 2) -> str:
    """Pretty-print JSON; collapse arrays of primitives to a single line."""
    return _format_json(data, indent, 0) + "\n"
