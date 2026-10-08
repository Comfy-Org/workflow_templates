"""Serialise templates/index.json the way it is committed.

`json.dump(indent=2)` puts every array element on its own line, which rewrites
the whole file and buries a one-field edit in thousands of diff lines. This keeps
short string arrays on one line, so a small change stays a small diff.

Arrays join with a bare comma, matching the committed `templates/index.json`
(`["Image to Video","Video"]`). Every writer of that file has to agree on this,
or two sync scripts reformat it in opposite directions on alternate runs. This is
separate from `json_format.dumps_compact_arrays`, which joins with `", "` and is
what the MCP pipeline writes its own files with.
"""

from __future__ import annotations

import json
import re
from typing import Any

# Arrays longer than this stay expanded: a single very long line is harder to
# read in a diff than the multi-line form it replaces.
MAX_INLINE_ARRAY_CHARS = 200

# Matches an array that json.dumps rendered across multiple lines. Already-inline
# arrays have no newline after `[` and are left alone.
_MULTILINE_ARRAY = re.compile(r"\[\s*\n\s*([^[\]]*?)\s*\n\s*\]", re.DOTALL)


def _compact_array(match: re.Match[str]) -> str:
    content = match.group(1)
    try:
        items = json.loads(f"[{content}]")
    except json.JSONDecodeError:
        return match.group(0)

    if not all(isinstance(item, str) for item in items):
        return match.group(0)

    inline = f"[{','.join(json.dumps(item, ensure_ascii=False) for item in items)}]"
    # Measured on the result, not on the expanded source: the source carries the
    # indentation this is removing, so a short array nested deeply could exceed
    # the limit on whitespace alone and never collapse.
    if len(inline) > MAX_INLINE_ARRAY_CHARS:
        return match.group(0)
    return inline


def dumps_index(data: Any, *, indent: int = 2) -> str:
    """Render index data with short string arrays inline."""
    return _MULTILINE_ARRAY.sub(_compact_array, json.dumps(data, ensure_ascii=False, indent=indent))
