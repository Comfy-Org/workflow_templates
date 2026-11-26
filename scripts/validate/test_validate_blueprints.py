#!/usr/bin/env python3
"""Unit tests for blueprint slot_index validation.

The frontend schema declares ``slot_index: zSlotIndex.optional()`` with no
``.nullable()``, so a stored ``"slot_index": null`` makes
``validateComfyWorkflow`` reject the file. Only numbers and numeric strings
pass. Cases match the template validator coverage added in PR #1458.
"""

import unittest

from slot_index import is_slot_index, validate_workflow_slot_indexes
from validate_blueprints import validate_slot_indexes


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
        errors = validate_workflow_slot_indexes(_workflow(None), "t.json")
        self.assertEqual(len(errors), 2, errors)
        self.assertIn("nodes[0].outputs[0].slot_index", errors[0])
        self.assertIn(
            "definitions.subgraphs[11111111-1111-1111-1111-111111111111]",
            errors[1],
        )
        self.assertIn("slot_index", errors[1])

    def test_omitted_slot_index_is_accepted(self):
        self.assertEqual(validate_workflow_slot_indexes(_workflow(...), "t.json"), [])

    def test_int_slot_index_is_accepted(self):
        self.assertEqual(validate_workflow_slot_indexes(_workflow(0), "t.json"), [])

    def test_numeric_string_slot_index_is_accepted(self):
        self.assertEqual(validate_workflow_slot_indexes(_workflow("0"), "t.json"), [])

    def test_bool_slot_index_is_rejected(self):
        self.assertFalse(is_slot_index(False))
        errors = validate_workflow_slot_indexes(_workflow(False), "t.json")
        self.assertEqual(len(errors), 2, errors)

    def test_null_input_slot_index_is_rejected(self):
        workflow = _workflow(0)
        workflow["nodes"][0]["inputs"] = [
            {"name": "image", "type": "IMAGE", "slot_index": None}
        ]
        errors = validate_workflow_slot_indexes(workflow, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("nodes[0].inputs[0].slot_index", errors[0])

    # zSlotIndex uses parseInt on strings, which stops at the first non-digit.
    # Matching it matters: a stricter checker would reject files the frontend
    # loads happily.
    def test_parse_int_style_strings_are_accepted(self):
        for value in ("3.7", "3abc", " 2", "-1", "0x10", "  -4abc"):
            with self.subTest(value=value):
                self.assertTrue(is_slot_index(value))

    def test_non_numeric_strings_are_rejected(self):
        # "0xG" and the Arabic digit are NaN from parseInt. #1458's regex
        # still accepts them; zSlotIndex does not.
        for value in ("abc", "", " ", "0xG", "٣"):
            with self.subTest(value=value):
                self.assertFalse(is_slot_index(value))

    def test_float_integral_is_accepted_and_fractional_rejected(self):
        self.assertTrue(is_slot_index(2.0))
        self.assertFalse(is_slot_index(2.5))

    def test_subgraph_tuple_links_are_validated(self):
        workflow = _workflow(0)
        workflow["definitions"]["subgraphs"][0]["links"] = [
            [1, 1, None, 2, 0, "IMAGE"]
        ]
        errors = validate_workflow_slot_indexes(workflow, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("subgraphs[", errors[0])
        self.assertIn("links[0][2]", errors[0])

    # Subgraph definitions store links as zComfyLinkObject, not tuples.
    def test_subgraph_object_links_are_validated(self):
        workflow = _workflow(0)
        workflow["definitions"]["subgraphs"][0]["links"] = [
            {
                "id": 1,
                "origin_id": 1,
                "origin_slot": 0,
                "target_id": 2,
                "target_slot": None,
                "type": "IMAGE",
            }
        ]
        errors = validate_workflow_slot_indexes(workflow, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("links[0].target_slot", errors[0])

    def test_valid_subgraph_object_link_is_accepted(self):
        workflow = _workflow(0)
        workflow["definitions"]["subgraphs"][0]["links"] = [
            {
                "id": 1,
                "origin_id": 1,
                "origin_slot": 0,
                "target_id": 2,
                "target_slot": "1",
                "type": "IMAGE",
            }
        ]
        self.assertEqual(validate_workflow_slot_indexes(workflow, "t.json"), [])

    def test_top_level_tuple_link_null_slot_is_rejected(self):
        workflow = _workflow(0)
        workflow["links"] = [[1, 1, 0, 2, None, "IMAGE"]]
        errors = validate_workflow_slot_indexes(workflow, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn(": links[0][4]", errors[0])

    def test_nested_subgraph_null_slot_index_is_rejected(self):
        workflow = _workflow(0)
        workflow["definitions"]["subgraphs"][0]["definitions"] = {
            "subgraphs": [
                {
                    "id": "22222222-2222-2222-2222-222222222222",
                    "nodes": [
                        {
                            "id": 3,
                            "type": "PreviewImage",
                            "outputs": [
                                {
                                    "name": "IMAGE",
                                    "type": "IMAGE",
                                    "slot_index": None,
                                }
                            ],
                        }
                    ],
                }
            ]
        }
        errors = validate_workflow_slot_indexes(workflow, "t.json")
        self.assertEqual(len(errors), 1, errors)
        self.assertIn("22222222-2222-2222-2222-222222222222", errors[0])
        self.assertIn("slot_index", errors[0])

    def test_current_blueprints_pass(self):
        self.assertEqual(validate_slot_indexes(), [])


if __name__ == "__main__":
    unittest.main()
