#!/usr/bin/env python3
"""Unit tests for recheck_github_links.py (no network)."""

import unittest

from recheck_github_links import api_path, report_errors

REPORT = """# Summary
| 🚫 Errors      | 3     |

## Errors per input

### Errors in links_to_check.txt

* [503] <https://github.com/bytedance/Bernini/blob/main/gradio_demo.py> (at 118:1) | Rejected
* [500] <https://github.com/Comfy-Org/ComfyUI/pull/14009> (at 91:1) | Rejected
* [404] <https://example.com/missing> (at 3:1) | Rejected

## Redirects per input
* [200] <https://github.com/a/b/blob/main/x.md> (at 1:1)
"""


class RecheckTests(unittest.TestCase):
    def test_reads_only_error_bullets(self):
        self.assertEqual(
            report_errors(REPORT),
            [
                ("503", "https://github.com/bytedance/Bernini/blob/main/gradio_demo.py"),
                ("500", "https://github.com/Comfy-Org/ComfyUI/pull/14009"),
                ("404", "https://example.com/missing"),
            ],
        )

    def test_api_paths(self):
        self.assertEqual(
            api_path("https://github.com/bytedance/Bernini/blob/main/gradio_demo.py"),
            "/repos/bytedance/Bernini/contents/gradio_demo.py?ref=main",
        )
        self.assertEqual(
            api_path("https://github.com/multimodal-art-projection/YuE/blob/main/docs/covers.md#x"),
            "/repos/multimodal-art-projection/YuE/contents/docs/covers.md?ref=main",
        )
        self.assertEqual(
            api_path("https://github.com/Comfy-Org/ComfyUI/pull/14009"),
            "/repos/Comfy-Org/ComfyUI/pulls/14009",
        )
        self.assertEqual(
            api_path("https://github.com/Comfy-Org/ComfyUI/issues/5/"),
            "/repos/Comfy-Org/ComfyUI/issues/5",
        )
        self.assertEqual(
            api_path("https://github.com/Comfy-Org/ComfyUI"), "/repos/Comfy-Org/ComfyUI"
        )
        self.assertIsNone(api_path("https://example.com/a"))
        self.assertIsNone(api_path("https://github.com/a/b/releases/tag/v1"))


if __name__ == "__main__":
    unittest.main()
