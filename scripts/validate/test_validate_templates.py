#!/usr/bin/env python3
"""Unit tests for slot_index validation in validate_templates.py.

The frontend schema declares ``slot_index: zSlotIndex.optional()`` with no
``.nullable()``, so a stored ``"slot_index": null`` makes
``validateComfyWorkflow`` reject the file and silently downgrade the template
to the legacy (id+type only) loader. Only numbers and numeric strings pass.
"""

import unittest

from validate_templates import _is_slot_index, _validate_workflow_04


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


if __name__ == "__main__":
    unittest.main()
