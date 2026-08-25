"""Regression tests for MCP model-option discovery in workflow subgraphs."""

import importlib.util
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

_spec = importlib.util.spec_from_file_location(
    "scan_api_node_models",
    REPO_ROOT / "scripts" / "mcp" / "lib" / "scan_api_node_models.py",
)
scan_api_node_models = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = scan_api_node_models
_spec.loader.exec_module(scan_api_node_models)


NODE_INDEX = {
    "ApiNode": {
        "model_options": ["Full model", "Lite model"],
    }
}


def _write_workflow(tmp_path: Path, workflow: dict) -> Path:
    path = tmp_path / "workflow.json"
    path.write_text(json.dumps(workflow), encoding="utf-8")
    return path


def test_finds_model_options_on_top_level_nodes(tmp_path):
    path = _write_workflow(tmp_path, {"nodes": [{"id": 1, "type": "ApiNode"}]})

    assert scan_api_node_models.model_options_for_workflow(path, NODE_INDEX) == {
        "ApiNode": ["Full model", "Lite model"]
    }


def test_finds_model_options_inside_subgraph_definitions(tmp_path):
    path = _write_workflow(
        tmp_path,
        {
            "nodes": [{"id": 1, "type": "SubgraphInstance"}],
            "definitions": {
                "subgraphs": [
                    {
                        "id": "subgraph-id",
                        "nodes": [{"id": 2, "type": "ApiNode"}],
                    }
                ]
            },
        },
    )

    assert scan_api_node_models.model_options_for_workflow(path, NODE_INDEX) == {
        "ApiNode": ["Full model", "Lite model"]
    }


def test_recurses_into_nested_subgraph_definitions(tmp_path):
    path = _write_workflow(
        tmp_path,
        {
            "nodes": [],
            "definitions": {
                "subgraphs": [
                    {
                        "nodes": [],
                        "definitions": {
                            "subgraphs": [
                                {"nodes": [{"id": 3, "type": "ApiNode"}]}
                            ]
                        },
                    }
                ]
            },
        },
    )

    assert scan_api_node_models.model_options_for_workflow(path, NODE_INDEX) == {
        "ApiNode": ["Full model", "Lite model"]
    }
