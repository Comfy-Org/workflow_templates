#!/usr/bin/env python3
"""Unit tests for check_widget_types.py (PM-2173)."""

import json
import tempfile
import unittest
from pathlib import Path

from check_widget_types import check_workflow, coerced_value, main, positional_widgets


def _dyn(*options):
    return ["COMFY_DYNAMICCOMBO_V3", {"options": [{"key": k, "inputs": i} for k, i in options]}]


OBJECT_INFO = {
    "Trellis2UpsampleStage": {
        "input": {
            "required": {
                "shape_latent": ["LATENT", {}],
                "target_resolution": ["INT", {"default": 1024, "min": 1024, "max": 2048}],
            }
        },
        "input_order": {"required": ["shape_latent", "target_resolution"]},
    },
    "CreateVideo": {
        "input": {
            "required": {"images": ["IMAGE", {}], "fps": ["FLOAT", {"default": 30.0}]},
            "optional": {
                "bit_depth": ["COMBO", {"default": "auto", "options": ["auto", 8, 10]}],
            },
        },
        "input_order": {"required": ["images", "fps"], "optional": ["bit_depth"]},
    },
    "Pruna": {
        "input": {
            "required": {
                "model": _dyn(
                    ("p-video", {"required": {"fps": ["COMBO", {"options": ["24", "48"]}]}})
                )
            }
        },
        "input_order": {"required": ["model"]},
    },
    # Flux3ImageNode shape: an autogrow socket input before the widgets.
    "Autogrow": {
        "input": {
            "required": {
                "prompt": ["STRING", {}],
                "images": ["COMFY_AUTOGROW_V3", {}],
                "safety_tolerance": ["INT", {}],
                "seed": ["INT", {"control_after_generate": True}],
            }
        },
        "input_order": {"required": ["prompt", "images", "safety_tolerance", "seed"]},
    },
    # GeminiNanoBanana2V2 shape: a socket-only child inside a dynamic combo.
    "SocketChild": {
        "input": {
            "required": {
                "model": _dyn(
                    (
                        "m",
                        {
                            "required": {"files": ["GEMINI_INPUT_FILES", {}]},
                            "optional": {"seed": ["INT", {"control_after_generate": True}]},
                        },
                    )
                ),
                "temperature": ["FLOAT", {}],
            }
        },
        "input_order": {"required": ["model", "temperature"]},
    },
    # BuildPoseFile shape: a dynamic combo nested inside a dynamic combo.
    "Nested": {
        "input": {
            "required": {
                "format": _dyn(
                    (
                        "glb",
                        {
                            "required": {
                                "mesh_style": _dyn(
                                    ("stick", {"required": {"stick_radius_m": ["FLOAT", {}]}})
                                ),
                                "smooth": ["INT", {}],
                            }
                        },
                    )
                ),
                "track_index": ["INT", {}],
            }
        },
        "input_order": {"required": ["format", "track_index"]},
    },
    "ComboControl": {
        "input": {
            "required": {
                "image": [["a.png", "b.png"], {"control_after_generate": True}],
                "steps": ["INT", {}],
            }
        },
        "input_order": {"required": ["image", "steps"]},
    },
    "SeedOff": {
        "input": {
            "required": {
                "seed": ["INT", {"control_after_generate": False}],
                "mode": ["STRING", {}],
            }
        },
        "input_order": {"required": ["seed", "mode"]},
    },
    "Load3D": {
        "input": {
            "required": {
                "model_file": ["COMBO", {"options": ["none"], "file_upload": True}],
                "image": ["LOAD_3D", {}],
                "width": ["INT", {}],
                "height": ["INT", {}],
            }
        },
        "input_order": {"required": ["model_file", "image", "width", "height"]},
    },
    "Loader": {
        "input": {
            "required": {
                "image": [["a.png"], {"image_upload": True}],
                "text": ["STRING", {"forceInput": True}],
                "rate": ["FLOAT,INT", {"widgetType": "FLOAT"}],
            }
        },
        "input_order": {"required": ["image", "text", "rate"]},
    },
}


def _check(nodes, subgraph_nodes=None, object_info=OBJECT_INFO):
    workflow = {"nodes": nodes}
    if subgraph_nodes is not None:
        workflow["definitions"] = {"subgraphs": [{"id": "sg", "nodes": subgraph_nodes}]}
    return check_workflow(Path("t.json"), workflow, object_info)


def _pairs(findings):
    return [(f.input_name, f.expected) for f in findings]


class CoercedValueTests(unittest.TestCase):
    def test_numeric_string_in_int(self):
        self.assertEqual(coerced_value("1536", ["INT", {}])[0], 1536)

    def test_large_integer_string_keeps_precision(self):
        self.assertEqual(coerced_value("9007199254740993", ["INT", {}])[0], 9007199254740993)

    def test_non_integral_string_in_int_is_not_a_coercion(self):
        self.assertIsNone(coerced_value("1.5", ["INT", {}]))

    def test_numeric_string_in_float(self):
        self.assertEqual(coerced_value("0.75", ["FLOAT", {}])[0], 0.75)

    def test_boolean_string(self):
        self.assertIs(coerced_value("false", ["BOOLEAN", {}])[0], False)

    def test_number_in_string_combo(self):
        self.assertEqual(coerced_value(4, ["COMBO", {"options": ["2", "4"]}])[0], "4")

    def test_integral_float_in_string_combo(self):
        self.assertEqual(coerced_value(8.0, ["COMBO", {"options": ["auto", "8"]}])[0], "8")
        self.assertIsNone(coerced_value(8.5, ["COMBO", {"options": ["8"]}]))

    def test_string_in_int_combo_legacy_shape(self):
        self.assertEqual(coerced_value("5", [[5, 10], {}])[0], 5)

    def test_correct_types_pass(self):
        self.assertIsNone(coerced_value(1536, ["INT", {}]))
        self.assertIsNone(coerced_value("1536", ["STRING", {}]))
        self.assertIsNone(coerced_value(8, ["COMBO", {"options": ["auto", 8, 10]}]))
        self.assertIsNone(coerced_value(True, ["BOOLEAN", {}]))

    def test_boolean_in_numeric_widget(self):
        self.assertEqual(coerced_value(True, ["INT", {}]), (1, "boolean in an INT widget"))
        self.assertEqual(coerced_value(False, ["FLOAT", {}])[0], 0.0)

    def test_number_in_string_widget(self):
        self.assertEqual(coerced_value(1024, ["STRING", {}])[0], "1024")
        self.assertIsNone(coerced_value(True, ["STRING", {}]))

    def test_number_in_boolean_widget(self):
        self.assertIs(coerced_value(0, ["BOOLEAN", {}])[0], False)
        self.assertIsNone(coerced_value(2, ["BOOLEAN", {}]))

    def test_dynamic_combo_selector(self):
        spec = _dyn(("2", {}), ("3", {}))
        self.assertEqual(coerced_value(2, spec)[0], "2")
        self.assertIsNone(coerced_value("2", spec))

    def test_multiselect_combo_skipped(self):
        self.assertIsNone(coerced_value(4, ["COMBO", {"options": ["4"], "multiselect": True}]))


class PositionalMappingTests(unittest.TestCase):
    def _map(self, node_type, values):
        node = {"type": node_type, "widgets_values": values}
        return {k: v for k, (v, _) in positional_widgets(node, OBJECT_INFO[node_type]).items()}

    def test_autogrow_input_owns_no_slot(self):
        self.assertEqual(
            self._map("Autogrow", ["p", "4", 42, "randomize"]),
            {"prompt": "p", "safety_tolerance": "4", "seed": 42},
        )

    def test_socket_child_in_branch_owns_no_slot(self):
        self.assertEqual(
            self._map("SocketChild", ["m", "680270809813060", "randomize", 0.5]),
            {"model": "m", "model.seed": "680270809813060", "temperature": 0.5},
        )

    def test_nested_dynamic_combo(self):
        self.assertEqual(
            self._map("Nested", ["glb", "stick", "0.022", 3, 1]),
            {
                "format": "glb",
                "format.mesh_style": "stick",
                "format.mesh_style.stick_radius_m": "0.022",
                "format.smooth": 3,
                "track_index": 1,
            },
        )

    def test_list_and_dict_values_do_not_break_lookahead(self):
        self.assertEqual(
            self._map("Autogrow", ["p", 4, [1, 2], {"a": 1}]),
            {"prompt": "p", "safety_tolerance": 4, "seed": [1, 2]},
        )

    def test_combo_control_owns_control_and_filter_slots(self):
        self.assertEqual(
            self._map("ComboControl", ["a.png", "increment-wrap", "", "20"]),
            {"image": "a.png", "steps": "20"},
        )

    def test_explicit_control_false_on_seed_owns_no_control_slot(self):
        self.assertEqual(self._map("SeedOff", [7, "fixed"]), {"seed": 7, "mode": "fixed"})

    def test_load3d_buttons_precede_the_load3d_slot(self):
        values = ["toy.glb", "upload3dmodel", "uploadExtraResources", "clear", "", "1024", 768]
        self.assertEqual(
            self._map("Load3D", values),
            {"model_file": "toy.glb", "image": "", "width": "1024", "height": 768},
        )

    def test_upload_slot_force_input_and_widget_type(self):
        self.assertEqual(
            self._map("Loader", ["a.png", "image", "25"]), {"image": "a.png", "rate": "25"}
        )


class CheckWorkflowTests(unittest.TestCase):
    def test_named_values_pm_2173(self):
        node = {
            "id": 94,
            "type": "Trellis2UpsampleStage",
            "inputs": [{"name": "shape_latent", "type": "LATENT", "link": 1}],
            "widgets_values": ["1536"],
            "widgets_values_named": {"target_resolution": "1536"},
        }
        findings = _check([node])
        self.assertEqual(_pairs(findings), [("target_resolution", 1536)])
        self.assertEqual(findings[0].fields, ("widgets_values", "widgets_values_named"))

    def test_wrong_positional_value_behind_correct_named_value(self):
        node = {
            "id": 94,
            "type": "Trellis2UpsampleStage",
            "widgets_values": ["1536"],
            "widgets_values_named": {"target_resolution": 1536},
        }
        self.assertEqual([f.fields for f in _check([node])], [("widgets_values",)])

    def test_partial_named_map_does_not_hide_positional_values(self):
        node = {
            "id": 1,
            "type": "CreateVideo",
            "widgets_values": ["30", "auto"],
            "widgets_values_named": {"bogus": 1},
        }
        self.assertEqual(_pairs(_check([node])), [("fps", 30)])

    def test_positional_values_inside_subgraph(self):
        node = {"id": 7, "type": "Trellis2UpsampleStage", "widgets_values": ["1536"]}
        findings = _check([], subgraph_nodes=[node])
        self.assertEqual([(f.node_id, f.scope) for f in findings], [(7, "subgraph sg")])

    def test_int_combo_options_are_not_stringified(self):
        node = {"id": 1, "type": "CreateVideo", "widgets_values": [30, 8]}
        self.assertEqual(_check([node]), [])

    def test_dynamic_combo_branch_named_and_positional(self):
        named = {
            "id": 3,
            "type": "Pruna",
            "widgets_values_named": {"model": "p-video", "model.fps": 24},
        }
        positional = {"id": 4, "type": "Pruna", "widgets_values": ["p-video", 24]}
        self.assertEqual(_pairs(_check([named, positional])), [("model.fps", "24")] * 2)

    def test_dynamic_combo_selector_in_both_forms(self):
        object_info = {
            "Dialogue": {
                "input": {"required": {"inputs": _dyn(("1", {}), ("2", {}))}},
                "input_order": {"required": ["inputs"]},
            }
        }
        node = {
            "id": 218,
            "type": "Dialogue",
            "widgets_values": [2],
            "widgets_values_named": {"inputs": 2},
        }
        findings = _check([node], object_info=object_info)
        self.assertEqual(_pairs(findings), [("inputs", "2")])

    def test_reviewer_shapes_are_detected(self):
        nodes = [
            {"id": 1, "type": "Autogrow", "widgets_values": ["p", "4", 42, "randomize"]},
            {"id": 2, "type": "SocketChild", "widgets_values": ["m", "6802", "randomize", 0.5]},
            {"id": 3, "type": "Nested", "widgets_values": ["glb", "stick", "0.022", 3, 1]},
        ]
        self.assertEqual(
            _pairs(_check(nodes)),
            [
                ("safety_tolerance", 4),
                ("model.seed", 6802),
                ("format.mesh_style.stick_radius_m", 0.022),
            ],
        )

    def test_branch_child_does_not_collide_with_top_level_input(self):
        object_info = {
            "Node": {
                "input": {
                    "required": {
                        "mode": _dyn(("a", {"required": {"size": ["INT", {}]}})),
                        "size": ["STRING", {}],
                    }
                },
                "input_order": {"required": ["mode", "size"]},
            }
        }
        node = {"id": 1, "type": "Node", "widgets_values": ["a", "512", "512"]}
        self.assertEqual(_pairs(_check([node], object_info=object_info)), [("mode.size", 512)])

    def test_unknown_node_types_are_skipped(self):
        node = {"id": 2, "type": "SomeCustomNode", "widgets_values": ["1536"]}
        self.assertEqual(_check([node]), [])


SG = "11111111-1111-1111-1111-111111111111"
INNER_SG = "22222222-2222-2222-2222-222222222222"


def _subgraph(sg_id, inputs, nodes, links):
    return {
        "id": sg_id,
        "inputs": [{"name": n, "type": t, "linkIds": ids} for n, t, ids in inputs],
        "nodes": nodes,
        "links": [
            {"id": i, "origin_id": -10, "origin_slot": 0, "target_id": t, "target_slot": s}
            for i, t, s in links
        ],
    }


def _instance_workflow(instance, *, inner_type="Trellis2UpsampleStage", definition_value=1536):
    inner = {
        "id": 5,
        "type": inner_type,
        "inputs": [
            {"name": "shape_latent", "type": "LATENT", "link": 1},
            {
                "name": "target_resolution",
                "type": "INT",
                "widget": {"name": "target_resolution"},
                "link": 2,
            },
        ],
        "widgets_values": [definition_value],
    }
    sg = _subgraph(
        SG,
        [("latent", "LATENT", [1]), ("target_resolution", "INT", [2])],
        [inner],
        [(1, 5, 0), (2, 5, 1)],
    )
    return {"nodes": [{"id": 29, "type": SG, **instance}], "definitions": {"subgraphs": [sg]}}


class SubgraphInstanceTests(unittest.TestCase):
    def _findings(self, workflow):
        return check_workflow(Path("t.json"), workflow, OBJECT_INFO)

    def test_bad_instance_value_shadows_valid_definition_default(self):
        workflow = _instance_workflow(
            {
                "widgets_values": ["1536"],
                "widgets_values_named": {"target_resolution": "1536"},
            }
        )
        findings = self._findings(workflow)
        self.assertEqual(_pairs(findings), [("target_resolution", 1536)])
        self.assertEqual((findings[0].node_id, findings[0].node_type), (29, SG))
        self.assertEqual(findings[0].fields, ("widgets_values", "widgets_values_named"))

    def test_correct_instance_values_pass(self):
        workflow = _instance_workflow({"widgets_values": [1536]})
        self.assertEqual(self._findings(workflow), [])

    def test_proxy_widgets_order_positional_slots(self):
        workflow = _instance_workflow(
            {
                "widgets_values": [None, "2048"],
                "properties": {
                    "proxyWidgets": [["5", "target_resolution"], ["-1", "target_resolution"]]
                },
            }
        )
        self.assertEqual(_pairs(self._findings(workflow)), [("target_resolution", 2048)])

    def test_three_element_proxy_widget_entry(self):
        workflow = _instance_workflow(
            {
                "widgets_values": ["1536"],
                "properties": {"proxyWidgets": [["5", "target_resolution", "5"]]},
            }
        )
        self.assertEqual(_pairs(self._findings(workflow)), [("5/target_resolution", 1536)])

    def test_unknown_inner_node_keeps_slot_alignment(self):
        workflow = _instance_workflow({"widgets_values": ["x", "1536"]})
        sg = workflow["definitions"]["subgraphs"][0]
        custom = {
            "id": 6,
            "type": "SomeCustomNode",
            "inputs": [{"name": "mode", "widget": {"name": "mode"}, "link": 3}],
        }
        sg["nodes"].insert(0, custom)
        sg["inputs"].insert(0, {"name": "mode", "type": "COMBO", "linkIds": [3]})
        sg["links"].append(
            {"id": 3, "origin_id": -10, "origin_slot": 0, "target_id": 6, "target_slot": 0}
        )
        self.assertEqual(_pairs(self._findings(workflow)), [("target_resolution", 1536)])

    def test_nested_subgraph_input_resolves_to_inner_widget(self):
        workflow = _instance_workflow({})
        inner_sg = workflow["definitions"]["subgraphs"][0]
        inner_sg["id"] = INNER_SG
        middle = {
            "id": 9,
            "type": INNER_SG,
            "inputs": [
                {
                    "name": "target_resolution",
                    "widget": {"name": "target_resolution"},
                    "link": 4,
                }
            ],
        }
        outer = _subgraph(SG, [("res", "INT", [4])], [middle], [(4, 9, 0)])
        workflow["definitions"]["subgraphs"].append(outer)
        workflow["nodes"][0]["widgets_values"] = ["1536"]
        self.assertEqual(_pairs(self._findings(workflow)), [("res", 1536)])


class PrimitiveNodeTests(unittest.TestCase):
    def _primitive(self, value, target_type="Trellis2UpsampleStage", widget="target_resolution"):
        return [
            {
                "id": 34,
                "type": "PrimitiveNode",
                "outputs": [{"name": "INT", "type": "INT", "links": [10]}],
                "widgets_values": [value, "fixed"],
            },
            {
                "id": 27,
                "type": target_type,
                "inputs": [{"name": widget, "widget": {"name": widget}, "link": 10}],
                "widgets_values": [1536],
            },
        ]

    def test_primitive_value_checked_against_driven_widget(self):
        workflow = {"nodes": self._primitive("1536"), "links": [[10, 34, 0, 27, 0, "INT"]]}
        findings = check_workflow(Path("t.json"), workflow, OBJECT_INFO)
        self.assertEqual([(f.node_id, f.expected) for f in findings], [(34, 1536)])

    def test_correct_primitive_passes(self):
        workflow = {"nodes": self._primitive(1536), "links": [[10, 34, 0, 27, 0, "INT"]]}
        self.assertEqual(check_workflow(Path("t.json"), workflow, OBJECT_INFO), [])

    def test_primitive_inside_subgraph_definition(self):
        sg = {
            "id": SG,
            "inputs": [],
            "nodes": self._primitive("1536"),
            "links": [
                {"id": 10, "origin_id": 34, "origin_slot": 0, "target_id": 27, "target_slot": 0}
            ],
        }
        workflow = {"nodes": [], "definitions": {"subgraphs": [sg]}}
        findings = check_workflow(Path("t.json"), workflow, OBJECT_INFO)
        self.assertEqual([(f.scope, f.expected) for f in findings], [(f"subgraph {SG}", 1536)])

    def test_primitive_driving_subgraph_instance_input(self):
        workflow = _instance_workflow({"widgets_values": [1536]})
        workflow["nodes"][0]["inputs"] = [
            {"name": "target_resolution", "widget": {"name": "target_resolution"}, "link": 10}
        ]
        workflow["nodes"].append(
            {
                "id": 34,
                "type": "PrimitiveNode",
                "outputs": [{"links": [10]}],
                "widgets_values": ["2048", "fixed"],
            }
        )
        workflow["links"] = [[10, 34, 0, 29, 0, "INT"]]
        findings = check_workflow(Path("t.json"), workflow, OBJECT_INFO)
        self.assertEqual([(f.node_id, f.expected) for f in findings], [(34, 2048)])

    def test_named_only_primitive_value(self):
        nodes = self._primitive("1536")
        del nodes[0]["widgets_values"]
        nodes[0]["widgets_values_named"] = {"value": "1536"}
        workflow = {"nodes": nodes, "links": [[10, 34, 0, 27, 0, "INT"]]}
        findings = check_workflow(Path("t.json"), workflow, OBJECT_INFO)
        self.assertEqual([f.fields for f in findings], [("widgets_values_named",)])

    def test_bad_named_primitive_value_next_to_correct_positional(self):
        nodes = self._primitive(1536)
        nodes[0]["widgets_values_named"] = {"value": "1536", "control_after_generate": "fixed"}
        workflow = {"nodes": nodes, "links": [[10, 34, 0, 27, 0, "INT"]]}
        findings = check_workflow(Path("t.json"), workflow, OBJECT_INFO)
        self.assertEqual(
            [(f.fields, f.expected) for f in findings], [(("widgets_values_named",), 1536)]
        )

    def test_primitive_into_reroute_is_skipped(self):
        nodes = self._primitive("1536", target_type="Reroute", widget="")
        workflow = {"nodes": nodes, "links": [[10, 34, 0, 27, 0, "*"]]}
        self.assertEqual(check_workflow(Path("t.json"), workflow, OBJECT_INFO), [])


class MainTests(unittest.TestCase):
    def test_blocking_files_limit_which_findings_fail(self):
        node = {"id": 94, "type": "Trellis2UpsampleStage", "widgets_values": ["1536"]}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "object_info.json").write_text(json.dumps(OBJECT_INFO))
            (root / "bad.json").write_text(json.dumps({"nodes": [node]}))
            args = ["--object-info", str(root / "object_info.json"), str(root / "bad.json")]
            (root / "changed.txt").write_text("other.json\n")
            self.assertEqual(main([*args, "--blocking-files", str(root / "changed.txt")]), 0)
            (root / "changed.txt").write_text(f"{root / 'bad.json'}\n")
            self.assertEqual(main([*args, "--blocking-files", str(root / "changed.txt")]), 1)
            self.assertEqual(main(args), 1)

    def test_missing_path_fails_instead_of_checking_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "object_info.json").write_text(json.dumps(OBJECT_INFO))
            args = ["--object-info", str(root / "object_info.json"), str(root / "templatez")]
            with self.assertRaises(SystemExit) as raised:
                main(args)
            self.assertIn("workflow path not found", str(raised.exception.code))



class SlotSchemaDriftTests(unittest.TestCase):
    """#1387-class drift must fail this CI check (runtime /object_info)."""

    def test_missing_required_seed_tail(self):
        from check_widget_types import slot_schema_findings

        node_def = {
            "input": {
                "required": {
                    "prompt": ["STRING", {}],
                    "duration": ["COMBO", {"options": ["5", "10"]}],
                    "seed": ["INT", {"default": 0, "control_after_generate": True}],
                }
            },
            "input_order": {"required": ["prompt", "duration", "seed"]},
        }
        node = {"id": 1, "type": "KlingLike", "inputs": [], "widgets_values": ["hi", "5"]}
        findings = slot_schema_findings(Path("kling.json"), "", node, "KlingLike", node_def)
        reasons = " ".join(f.reason for f in findings)
        self.assertTrue(findings, "expected missing-seed finding")
        self.assertIn("widget_slot_mismatch", reasons)

    def test_invalid_dynamic_combo_key(self):
        from check_widget_types import slot_schema_findings

        node_def = {
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
        }
        node = {
            "id": 1,
            "type": "SeedreamLike",
            "inputs": [],
            "widgets_values": ["p", "standard", True],
        }
        findings = slot_schema_findings(Path("lite.json"), "", node, "SeedreamLike", node_def)
        reasons = " ".join(f.reason for f in findings)
        self.assertTrue(findings)
        self.assertIn("invalid_combo_value", reasons)

    def test_valid_lite_layout_clean(self):
        from check_widget_types import slot_schema_findings

        node_def = {
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
                                        "required": {"max_images": ["INT", {"default": 1}]}
                                    },
                                }
                            ]
                        },
                    ],
                }
            },
            "input_order": {"required": ["prompt", "mode"]},
        }
        node = {
            "id": 1,
            "type": "SeedreamLike",
            "inputs": [],
            "widgets_values": ["p", "lite", 4],
        }
        self.assertEqual(
            slot_schema_findings(Path("lite.json"), "", node, "SeedreamLike", node_def),
            [],
        )


if __name__ == "__main__":
    unittest.main()
