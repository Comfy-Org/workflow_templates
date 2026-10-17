#!/usr/bin/env python3
"""Unit tests for widget mapping and type checks in workflow.py."""

import unittest

from registry import build_specs_from_object_info
from workflow import check_widget_values, is_widget_backed_input, widget_values_by_input

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


if __name__ == "__main__":
    unittest.main()
