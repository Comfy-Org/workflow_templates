#!/usr/bin/env python3
"""Unit tests for --blocking-files exit scoping in check.py."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from check import issues_that_block, load_blocking_basenames
from models import Issue


def _err(workflow: str, kind: str = "widget_slot_mismatch") -> Issue:
    return Issue(
        severity="error",
        kind=kind,
        workflow=workflow,
        node_id="1",
        node_type="SomeNode",
        message="test",
    )


class BlockingFilesTests(unittest.TestCase):
    def test_load_basenames_from_paths(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
            fh.write("templates/seedream_4_0_lite_t2i.json\n")
            fh.write("blueprints/foo.json\n")
            fh.write("\n")
            path = Path(fh.name)
        try:
            self.assertEqual(
                load_blocking_basenames(path),
                {"seedream_4_0_lite_t2i.json", "foo.json"},
            )
        finally:
            path.unlink()

    def test_none_blocking_keeps_all_issues(self):
        issues = [_err("a.json"), _err("b.json")]
        self.assertEqual(issues_that_block(issues, None), issues)

    def test_empty_blocking_set_blocks_nothing(self):
        # PR touched no templates → CI scripts-only change must stay green.
        issues = [_err("a.json", "widget_slot_mismatch")]
        self.assertEqual(issues_that_block(issues, set()), [])

    def test_only_listed_workflows_block(self):
        a = _err("seedream_4_0_lite_t2i.json", "invalid_widget_value")
        b = _err("kling_text_to_video.json", "widget_slot_mismatch")
        c = _err("unrelated.json", "missing_node")
        blocked = issues_that_block(
            [a, b, c], {"seedream_4_0_lite_t2i.json", "kling_text_to_video.json"}
        )
        self.assertEqual(blocked, [a, b])

    def test_slot_kinds_are_errors(self):
        # Document the severity contract CI relies on for #1387-class drift.
        from models import ERROR_ISSUE_KINDS

        for kind in (
            "widget_slot_mismatch",
            "invalid_widget_value",
            "invalid_combo_value",
        ):
            self.assertIn(kind, ERROR_ISSUE_KINDS)


if __name__ == "__main__":
    unittest.main()
