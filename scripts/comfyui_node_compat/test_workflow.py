#!/usr/bin/env python3
"""Unit tests for widget mapping and type checks in workflow.py.

The imports are bare module names, so run from the repository root with this
directory as the discovery root:

    PYTHONPATH=scripts/lib python3 -m unittest discover \\
        -s scripts/comfyui_node_compat -p 'test_*.py'
"""

import unittest

from registry import build_specs_from_object_info
from workflow import (
    check_widget_values,
    expected_widget_slot_count,
    is_widget_backed_input,
    value_matches_input_type,
    widget_values_by_input,
)

OBJECT_INFO = {
    "ApiNode": {
        "input": {
            "required": {
                "prompt": ["STRING", {}],
                "images": ["COMFY_AUTOGROW_V3", {}],
                "duration": ["COMBO", {"options": [5, 10]}],
                "quality": ["COMBO", {"options": ["1080p", "720p"]}],
                "model": [
                    "COMFY_DYNAMICCOMBO_V3",
                    {
                        "options": [
                            {
                                "key": "m",
                                "inputs": {
                                    "required": {
                                        "files": ["GEMINI_INPUT_FILES", {}],
                                        "system_prompt": ["STRING", {}],
                                    }
                                },
                            }
                        ]
                    },
                ],
            }
        },
        "input_order": {"required": ["prompt", "images", "duration", "quality", "model"]},
        "api_node": True,
    }
}
SPECS = build_specs_from_object_info(OBJECT_INFO)


class WidgetMappingTests(unittest.TestCase):
    def test_only_dynamic_combo_of_the_dynamic_types_is_a_widget(self):
        self.assertTrue(is_widget_backed_input("COMFY_DYNAMICCOMBO_V3"))
        self.assertFalse(is_widget_backed_input("COMFY_AUTOGROW_V3"))
        self.assertFalse(is_widget_backed_input("COMFY_MATCHTYPE_V3"))

    def test_socket_inputs_own_no_slot(self):
        node = {
            "type": "ApiNode",
            "inputs": [],
            "widgets_values": ["p", 5, "720p", "m", "be helpful"],
        }
        self.assertEqual(
            widget_values_by_input(node, SPECS["ApiNode"]),
            {
                "prompt": "p",
                "duration": 5,
                "quality": "720p",
                "model": "m",
                "system_prompt": "be helpful",
            },
        )

    def test_int_combo_value_is_not_an_invalid_widget_value(self):
        node = {
            "type": "ApiNode",
            "inputs": [],
            "widgets_values": ["p", 5, "720p", "m", "be helpful"],
        }
        spec = SPECS["ApiNode"]
        values = widget_values_by_input(node, spec)
        self.assertEqual(check_widget_values("t.json", node, spec, "1", "ApiNode", values), [])

    def _kinds(self, values):
        node = {"type": "ApiNode", "inputs": [], "widgets_values": values}
        spec = SPECS["ApiNode"]
        mapped = widget_values_by_input(node, spec)
        return [i.kind for i in check_widget_values("t.json", node, spec, "1", "ApiNode", mapped)]

    def test_number_outside_int_combo_options_is_flagged(self):
        self.assertIn("invalid_widget_value", self._kinds(["p", 7, "720p", "m", "x"]))

    def test_number_in_string_only_combo_is_flagged(self):
        self.assertIn("invalid_widget_value", self._kinds(["p", 5, 42, "m", "x"]))

    def test_integral_float_matches_int_option(self):
        self.assertEqual(self._kinds(["p", 5.0, "720p", "m", "x"]), [])

    def test_expected_slot_count_skips_socket_only_branch_children(self):
        node = {"type": "ApiNode", "inputs": [], "widgets_values": ["p", 5, "720p", "m", "x"]}
        self.assertEqual(expected_widget_slot_count(node, SPECS["ApiNode"]), 5)


SEED_INFO = {
    "SeedFirst": {
        "input": {
            "required": {
                "seed": ["INT", {}],
                "model": [
                    "COMFY_DYNAMICCOMBO_V3",
                    {"options": [{"key": "m", "inputs": {"required": {"text": ["STRING", {}]}}}]},
                ],
            }
        },
        "input_order": {"required": ["seed", "model"]},
    }
}


class SlotCountParityTests(unittest.TestCase):
    def test_seed_control_token_counts_and_keeps_branch_aligned(self):
        spec = build_specs_from_object_info(SEED_INFO)["SeedFirst"]
        node = {"type": "SeedFirst", "inputs": [], "widgets_values": [42, "randomize", "m", "hi"]}
        self.assertEqual(expected_widget_slot_count(node, spec), 4)
        self.assertEqual(widget_values_by_input(node, spec)["text"], "hi")

    def test_seed_without_control_token_is_one_slot(self):
        spec = build_specs_from_object_info(SEED_INFO)["SeedFirst"]
        node = {"type": "SeedFirst", "inputs": [], "widgets_values": [42, "m", "hi"]}
        self.assertEqual(expected_widget_slot_count(node, spec), 3)


class NumericComboProvenanceTests(unittest.TestCase):
    def _specs(self, options):
        object_info = {
            "Node": {
                "input": {"required": {"duration": ["COMBO", {"options": options}]}},
                "input_order": {"required": ["duration"]},
                "api_node": True,
            }
        }
        return build_specs_from_object_info(object_info)["Node"]

    def _issues(self, options, value):
        spec = self._specs(options)
        node = {"type": "Node", "inputs": [], "widgets_values": [value]}
        values = widget_values_by_input(node, spec)
        return [i.kind for i in check_widget_values("t.json", node, spec, "1", "Node", values)]

    def test_int_accepted_for_numeric_options(self):
        self.assertEqual(self._issues([5, 10], 5), [])

    def test_int_rejected_for_string_options(self):
        self.assertIn("invalid_widget_value", self._issues(["5", "10"], 5))

    def test_string_accepted_for_string_options(self):
        self.assertEqual(self._issues(["5", "10"], "5"), [])

    def test_integral_float_options_match_int_and_float_values(self):
        self.assertEqual(self._issues([5.0, 10.0], 5), [])
        self.assertEqual(self._issues([5.0, 10.0], 5.0), [])

    def test_value_matches_without_numeric_options(self):
        self.assertFalse(value_matches_input_type(5, "COMBO", required=True))
        self.assertTrue(value_matches_input_type(5, "COMBO", required=True, numeric_options=["5"]))


if __name__ == "__main__":
    unittest.main()
