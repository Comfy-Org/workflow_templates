"""Tests for scripts/lib/index_format.py.

Two scripts write templates/index.json. If they disagree on formatting, each run
reformats what the other wrote and the file churns thousands of lines. These pin
the format, including that it reproduces the committed file exactly.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

_lib = REPO_ROOT / "scripts" / "lib"
if str(_lib) not in sys.path:
    sys.path.insert(0, str(_lib))

from index_format import MAX_INLINE_ARRAY_CHARS, dumps_index  # noqa: E402


def test_short_string_arrays_go_inline_without_a_space():
    out = dumps_index([{"tags": ["Image to Video", "Video"]}])
    assert '"tags": ["Image to Video","Video"]' in out


def test_empty_and_single_element_arrays():
    assert '"tags": []' in dumps_index([{"tags": []}])
    assert '"tags": ["One"]' in dumps_index([{"tags": ["One"]}])


def test_arrays_of_objects_stay_expanded():
    out = dumps_index([{"io": [{"a": 1}]}])
    assert '"io": [\n' in out


def test_mixed_type_arrays_stay_expanded():
    out = dumps_index([{"mixed": ["a", 1]}])
    assert '"mixed": [\n' in out


def test_a_long_array_stays_expanded():
    out = dumps_index([{"tags": ["x" * 60, "y" * 60, "z" * 60, "w" * 60]}])
    assert '"tags": [\n' in out


# The length is measured on the inline result, not on the expanded source. A
# short array nested deeply carries enough indentation to exceed the limit on
# whitespace alone, and used to be left expanded because of it.
def test_the_limit_measures_the_result_not_the_indentation():
    deep = {"a": {"b": {"c": {"d": {"e": {"f": {"g": {"tags": ["One", "Two"]}}}}}}}}
    expanded = json.dumps(deep, indent=2)
    source_len = expanded[expanded.index("[") : expanded.index("]")]
    assert len(source_len) > 20, "fixture should carry real indentation"

    assert '"tags": ["One","Two"]' in dumps_index(deep)


def test_an_array_just_over_the_limit_stays_expanded():
    # Two items whose inline form lands just past the cap.
    item = "x" * (MAX_INLINE_ARRAY_CHARS // 2)
    out = dumps_index([{"tags": [item, item]}])
    assert '"tags": [\n' in out


def test_non_ascii_is_not_escaped():
    assert '"tags": ["图像"]' in dumps_index([{"tags": ["图像"]}])


def test_reproduces_the_committed_index_byte_for_byte():
    """The format is only safe to share if it is already what is on disk."""
    path = REPO_ROOT / "templates" / "index.json"
    committed = path.read_text(encoding="utf-8")
    assert dumps_index(json.loads(committed)) == committed
