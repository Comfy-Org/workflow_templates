#!/usr/bin/env python3
"""Unit tests for the no-torch static scan in static_registry.py.

Run from the repository root with this directory as the discovery root:

    PYTHONPATH=scripts/lib python3 -m unittest discover \\
        -s scripts/comfyui_node_compat -p 'test_*.py'
"""

import tempfile
import unittest
from pathlib import Path

from static_registry import build_specs_static

V1_NODE = """
class LegacyNode:
    pass

NODE_CLASS_MAPPINGS = {"LegacyNode": LegacyNode}
"""

V3_NODE = """
from comfy_api.latest import io

class MeshNode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(node_id="MeshNode", display_name="Mesh Node")
"""


class StaticScanEncodingTest(unittest.TestCase):
    def scan(self, files: dict[str, str], encoding: str):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "nodes.py").write_text("NODE_CLASS_MAPPINGS = {}\n", encoding="utf-8")
            for relative, source in files.items():
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(source, encoding=encoding)
            return build_specs_static(root)

    def test_utf8_bom_sources_are_scanned_not_skipped(self):
        specs, warnings = self.scan(
            {
                "comfy_extras/nodes_legacy.py": V1_NODE,
                "comfy_extras/mesh3d/nodes_mesh_io.py": V3_NODE,
            },
            encoding="utf-8-sig",
        )
        self.assertEqual([w for w in warnings if "syntax error" in w], [])
        self.assertIn("LegacyNode", specs)
        self.assertIn("MeshNode", specs)

    def test_plain_utf8_sources_still_scanned(self):
        specs, warnings = self.scan(
            {
                "comfy_extras/nodes_legacy.py": V1_NODE,
                "comfy_extras/mesh3d/nodes_mesh_io.py": V3_NODE,
            },
            encoding="utf-8",
        )
        self.assertEqual([w for w in warnings if "syntax error" in w], [])
        self.assertIn("LegacyNode", specs)
        self.assertIn("MeshNode", specs)


if __name__ == "__main__":
    unittest.main()
