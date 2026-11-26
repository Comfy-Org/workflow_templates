#!/usr/bin/env python3
"""Unit tests for validate_templates.py.

``SlotIndexTests``: the frontend schema declares ``slot_index:
zSlotIndex.optional()`` with no ``.nullable()``, so a stored ``"slot_index":
null`` makes ``validateComfyWorkflow`` reject the file and silently downgrade
the template to the legacy (id+type only) loader. Only numbers and numeric
strings pass.

``CatalogParityTests``: ``/templates/<name>.json`` is served from the same
directory the catalog indexes advertise, so a workflow file or index entry that
only one surface knows about is loadable by name and invisible in the UI (or
the reverse). Linear PM-877.
"""

import json
import tempfile
import unittest
from pathlib import Path

from validate_templates import (
    _is_slot_index,
    _validate_workflow_04,
    check_file_consistency,
    check_index_parity,
)


def _workflow(slot_index):
    """Minimal 0.4 workflow with one top-level and one subgraph output slot."""
    output = {"name": "IMAGE", "type": "IMAGE", "links": [1]}
    if slot_index is not ...:
        output["slot_index"] = slot_index
    return {
        "last_node_id": 2,
        "last_link_id": 1,
        "version": 0.4,
        "nodes": [
            {
                "id": 1,
                "type": "SaveImage",
                "order": 0,
                "mode": 0,
                "inputs": [],
                "outputs": [dict(output)],
            }
        ],
        "links": [[1, 1, 0, 2, 0, "IMAGE"]],
        "definitions": {
            "subgraphs": [
                {
                    "id": "11111111-1111-1111-1111-111111111111",
                    "nodes": [
                        {
                            "id": 1,
                            "type": "KSampler",
                            "outputs": [dict(output)],
                        }
                    ],
                }
            ]
        },
    }


class SlotIndexTests(unittest.TestCase):
    def test_null_slot_index_is_rejected(self):
        errors = _validate_workflow_04(_workflow(None), "t.json")
        self.assertEqual(len(errors), 2, errors)
        self.assertIn("nodes[0].outputs[0].slot_index", errors[0])
        self.assertIn("definitions.subgraphs[11111111-1111-1111-1111-111111111111]", errors[1])
        self.assertIn("slot_index", errors[1])

    def test_omitted_slot_index_is_accepted(self):
        self.assertEqual(_validate_workflow_04(_workflow(...), "t.json"), [])

    def test_int_slot_index_is_accepted(self):
        self.assertEqual(_validate_workflow_04(_workflow(0), "t.json"), [])

    def test_numeric_string_slot_index_is_accepted(self):
        self.assertEqual(_validate_workflow_04(_workflow("0"), "t.json"), [])

    def test_bool_slot_index_is_rejected(self):
        self.assertFalse(_is_slot_index(False))
        errors = _validate_workflow_04(_workflow(False), "t.json")
        self.assertEqual(len(errors), 2, errors)

    # zSlotIndex uses parseInt on strings, which stops at the first non-digit.
    # Matching it matters: a stricter checker would reject templates the
    # frontend loads happily.
    def test_parse_int_style_strings_are_accepted(self):
        for value in ("3.7", "3abc", " 2", "-1"):
            with self.subTest(value=value):
                self.assertTrue(_is_slot_index(value))

    def test_non_numeric_strings_are_rejected(self):
        for value in ("abc", "", " "):
            with self.subTest(value=value):
                self.assertFalse(_is_slot_index(value))

    def test_float_integral_is_accepted_and_fractional_rejected(self):
        self.assertTrue(_is_slot_index(2.0))
        self.assertFalse(_is_slot_index(2.5))

    def test_subgraph_tuple_links_are_validated(self):
        wf = _workflow(0)
        wf["definitions"]["subgraphs"][0]["links"] = [[1, 1, None, 2, 0, "IMAGE"]]
        errors = _validate_workflow_04(wf, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("subgraphs[", errors[0])
        self.assertIn("links[0][2]", errors[0])

    # Subgraph definitions store links as zComfyLinkObject, not tuples.
    def test_subgraph_object_links_are_validated(self):
        wf = _workflow(0)
        wf["definitions"]["subgraphs"][0]["links"] = [
            {"id": 1, "origin_id": 1, "origin_slot": 0, "target_id": 2,
             "target_slot": None, "type": "IMAGE"}
        ]
        errors = _validate_workflow_04(wf, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("links[0].target_slot", errors[0])


def _index(*names):
    """One-category index advertising the given template names."""
    return [
        {
            "moduleName": "default",
            "title": "Basics",
            "templates": [
                {"name": name, "mediaType": "image", "mediaSubtype": "webp"}
                for name in names
            ],
        }
    ]


class CatalogParityTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.templates_dir = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def write(self, filename, data):
        (self.templates_dir / filename).write_text(
            json.dumps(data), encoding="utf-8"
        )

    def test_unindexed_workflow_file_is_an_error(self):
        index = _index("api_indexed")
        self.write("index.json", index)
        self.write("api_indexed.json", {})
        self.write("api_unindexed.json", {})

        valid, errors, _ = check_file_consistency(index, self.templates_dir)

        self.assertFalse(valid)
        self.assertTrue(
            any("api_unindexed.json" in error for error in errors), errors
        )

    def test_indexed_workflow_file_is_accepted(self):
        index = _index("api_indexed")
        self.write("index.json", index)
        self.write("api_indexed.json", {})

        valid, errors, _ = check_file_consistency(index, self.templates_dir)

        self.assertTrue(valid, errors)

    def test_locale_index_missing_a_template_is_an_error(self):
        index = _index("api_one", "api_two")
        self.write("index.json", index)
        self.write("index.zh.json", _index("api_one"))

        valid, errors = check_index_parity(index, self.templates_dir)

        self.assertFalse(valid)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("index.zh.json", errors[0])
        self.assertIn("api_two", errors[0])

    def test_locale_index_with_an_unknown_template_is_an_error(self):
        index = _index("api_one")
        self.write("index.json", index)
        self.write("index.zh.json", _index("api_one", "api_ghost"))

        valid, errors = check_index_parity(index, self.templates_dir)

        self.assertFalse(valid)
        self.assertIn("api_ghost", errors[0])

    def test_mcp_index_may_be_a_subset(self):
        index = _index("api_one", "api_two")
        self.write("index.json", index)
        self.write("index.mcp.json", _index("api_one"))

        valid, errors = check_index_parity(index, self.templates_dir)

        self.assertTrue(valid, errors)

    def test_mcp_index_naming_an_unlisted_template_is_an_error(self):
        index = _index("api_one")
        self.write("index.json", index)
        self.write("index.mcp.json", _index("api_one", "api_agent_only"))

        valid, errors = check_index_parity(index, self.templates_dir)

        self.assertFalse(valid)
        self.assertIn("index.mcp.json", errors[0])
        self.assertIn("api_agent_only", errors[0])

    def test_parity_holds_when_every_index_agrees(self):
        index = _index("api_one", "api_two")
        self.write("index.json", index)
        self.write("index.zh.json", _index("api_two", "api_one"))
        self.write("index.mcp.json", _index("api_one", "api_two"))

        valid, errors = check_index_parity(index, self.templates_dir)

        self.assertTrue(valid, errors)


if __name__ == "__main__":
    unittest.main()
