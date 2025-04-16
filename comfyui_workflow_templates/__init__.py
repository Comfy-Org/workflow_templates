"""
ComfyUI Workflow Templates Package
"""

import importlib.resources


def get_templates_path():
    """Return the absolute path to the templates directory"""
    try:
        return str(
            importlib.resources.files("comfyui_workflow_templates") / "templates"
        )
    except Exception as e:
        print(f"Error accessing templates: {e}")
        return None
