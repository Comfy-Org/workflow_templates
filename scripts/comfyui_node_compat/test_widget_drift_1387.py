#!/usr/bin/env python3
"""Regression: #1387-class widget drift must surface as blocking error kinds.

Mirrors Seedream Lite-vs-Pro DynamicCombo layout mistakes and Kling templates
that omit trailing seed + control_after_generate. CI relies on runtime
``/object_info`` (not ``--static-scan``) plus ``--blocking-files`` to fail PRs.
"""

from __future__ import annotations

import unittest

from registry import build_specs_from_object_info
from workflow import check_node, check_widget_slot_alignment


# Kling-like: required seed with control_after_generate at the tail.
KLING_INFO = {
    "KlingLike": {
        "input": {
            "required": {
                "prompt": ["STRING", {}],
                "duration": ["COMBO", {"options": ["5", "10"]}],
                "seed": ["INT", {"default": 0, "control_after_generate": True}],
            }
        },
        "input_order": {"required": ["prompt", "duration", "seed"]},
        "api_node": True,
    }
}

# Seedream-like: Lite vs Pro DynamicCombo branches with different nested widgets.
SEEDREAM_INFO = {
    "SeedreamLike": {
        "input": {
            "required": {
                "prompt": ["STRING", {}],
                "mode": [
                    "COMFY_DYNAMICCOMBO_V3",
                    {
                        "options": [
                            {
                                "key": "lite",
                                "inputs": {
                                    "required": {
                                        "max_images": ["INT", {"default": 1}],
                                        "fail_on_partial": ["BOOLEAN", {"default": False}],
                                    }
                                },
                            },
                            {
                                "key": "pro",
                                "inputs": {
                                    "required": {
                                        "prompt_optimization": [
                                            "COMBO",
                                            {"options": ["standard", "fast"]},
                                        ],
                                    }
                                },
                            },
                        ]
                    },
                ],
            }
        },
        "input_order": {"required": ["prompt", "mode"]},
        "api_node": True,
    }
}


class KlingMissingSeedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.specs = build_specs_from_object_info(KLING_INFO)

    def test_complete_widgets_ok(self):
        node = {
            "id": 1,
            "type": "KlingLike",
            "inputs": [],
            "widgets_values": ["hello", "5", 0, "fixed"],
        }
        ok, _ = check_widget_slot_alignment(node, self.specs["KlingLike"])
        self.assertTrue(ok)
        self.assertEqual(check_node("kling.json", node, self.specs, strict_unknown=False), [])

    def test_missing_seed_and_control_is_widget_slot_mismatch(self):
        # Pre-#1387 Kling pattern: prompt+duration only, seed tail omitted.
        node = {
            "id": 1,
            "type": "KlingLike",
            "inputs": [],
            "widgets_values": ["hello", "5"],
        }
        ok, message = check_widget_slot_alignment(node, self.specs["KlingLike"])
        self.assertFalse(ok, message)
        kinds = {i.kind for i in check_node("kling.json", node, self.specs, strict_unknown=False)}
        self.assertIn("widget_slot_mismatch", kinds)


class SeedreamLiteProDriftTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.specs = build_specs_from_object_info(SEEDREAM_INFO)

    def test_lite_layout_ok(self):
        node = {
            "id": 1,
            "type": "SeedreamLike",
            "inputs": [],
            "widgets_values": ["a prompt", "lite", 4, False],
        }
        self.assertEqual(check_node("lite.json", node, self.specs, strict_unknown=False), [])

    def test_pro_key_on_lite_shaped_values_flagged(self):
        # Pro-only combo key / nested value used where Lite schema expects lite branch.
        # "standard" is not a valid mode key → invalid_combo_value (or slot mismatch).
        node = {
            "id": 1,
            "type": "SeedreamLike",
            "inputs": [],
            "widgets_values": ["a prompt", "standard", True],
        }
        kinds = {i.kind for i in check_node("lite.json", node, self.specs, strict_unknown=False)}
        self.assertTrue(
            kinds & {"invalid_combo_value", "invalid_widget_value", "widget_slot_mismatch"},
            f"expected slot/schema error, got {kinds}",
        )

    def test_pro_layout_ok(self):
        node = {
            "id": 1,
            "type": "SeedreamLike",
            "inputs": [],
            "widgets_values": ["a prompt", "pro", "standard"],
        }
        self.assertEqual(check_node("pro.json", node, self.specs, strict_unknown=False), [])


if __name__ == "__main__":
    unittest.main()
