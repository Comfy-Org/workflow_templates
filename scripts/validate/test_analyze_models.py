#!/usr/bin/env python3
"""Unit tests for subgraph model checks in analyze_models.py."""

import json
import os
import tempfile
import unittest

from analyze_models import analyze_json_file, analyze_subgraph_instances


def _stale_subgraph_workflow():
    sg_id = "11111111-1111-1111-1111-111111111111"
    return {
        "nodes": [
            {
                "id": 12,
                "type": sg_id,
                "widgets_values": [
                    "used_on_instance.safetensors",
                ],
                "properties": {},
            }
        ],
        "definitions": {
            "subgraphs": [
                {
                    "id": sg_id,
                    "inputs": [
                        {
                            "name": "unet_name",
                            "type": "COMBO",
                            "linkIds": [53],
                        }
                    ],
                    "nodes": [
                        {
                            "id": 1,
                            "type": "UNETLoader",
                            "inputs": [
                                {"name": "unet_name", "type": "COMBO", "link": 53}
                            ],
                            "properties": {
                                "models": [
                                    {
                                        "name": "leftover_old.safetensors",
                                        "url": "https://example.com/leftover_old.safetensors",
                                        "directory": "diffusion_models",
                                    }
                                ]
                            },
                            "widgets_values": ["leftover_old.safetensors"],
                        }
                    ],
                }
            ]
        },
    }


def _matched_subgraph_workflow():
    data = _stale_subgraph_workflow()
    inner = data["definitions"]["subgraphs"][0]["nodes"][0]
    inner["widgets_values"] = ["used_on_instance.safetensors"]
    inner["properties"]["models"][0] = {
        "name": "used_on_instance.safetensors",
        "url": "https://example.com/used_on_instance.safetensors",
        "directory": "diffusion_models",
    }
    return data


class TestSubgraphModelChecks(unittest.TestCase):
    def test_stale_inner_model_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "stale.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(_stale_subgraph_workflow(), f)
            result = analyze_json_file(path)
            self.assertEqual(
                result["analysis"]["subgraph_missing_urls"][0]["models"],
                ["used_on_instance.safetensors"],
            )
            self.assertEqual(
                result["analysis"]["subgraph_stale_definition"][0]["instance_model"],
                "used_on_instance.safetensors",
            )
            self.assertEqual(
                result["analysis"]["subgraph_stale_definition"][0]["definition_models"],
                ["leftover_old.safetensors"],
            )

    def test_matching_inner_model_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "ok.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(_matched_subgraph_workflow(), f)
            result = analyze_json_file(path)
            self.assertEqual(result["analysis"]["subgraph_missing_urls"], [])
            self.assertEqual(result["analysis"]["subgraph_stale_definition"], [])

    def test_instance_url_covers_multi_instance(self):
        data = _stale_subgraph_workflow()
        data["nodes"][0]["properties"] = {
            "models": [
                {
                    "name": "used_on_instance.safetensors",
                    "url": "https://example.com/used_on_instance.safetensors",
                    "directory": "diffusion_models",
                }
            ]
        }
        result = {"analysis": {"subgraph_missing_urls": [], "subgraph_stale_definition": []}}
        analyze_subgraph_instances(data, result)
        self.assertEqual(result["analysis"]["subgraph_missing_urls"], [])
        self.assertEqual(result["analysis"]["subgraph_stale_definition"], [])


if __name__ == "__main__":
    unittest.main()
