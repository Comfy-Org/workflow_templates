# comfyui-subgraph-blueprints

Pre-built subgraph blueprints for ComfyUI.

Subgraph Blueprints are reusable workflow components that appear as single nodes in ComfyUI. They abstract complex node configurations into user-friendly creative primitives like "Text to Image" or "Image Edit".

## Installation

```bash
pip install comfyui-subgraph-blueprints
```

## Blueprint Format

Blueprints use the **native ComfyUI subgraph format** with `definitions.subgraphs`:

```json
{
  "id": "workflow-uuid",
  "nodes": [{"id": -1, "type": "subgraph-uuid", ...}],
  "definitions": {
    "subgraphs": [{
      "id": "subgraph-uuid",
      "name": "Text to Image (Flux.1 Dev)",
      "inputs": [{"name": "text", "type": "STRING"}, ...],
      "outputs": [{"name": "IMAGE", "type": "IMAGE"}],
      "nodes": [...],
      "links": [...]
    }]
  }
}
```

## Usage

```python
from comfyui_workflow_templates_core.loader import (
    iter_blueprints,
    get_blueprint_entry,
    get_blueprint_asset_path,
)
import json

# List all available blueprints
for blueprint in iter_blueprints():
    print(f"{blueprint.blueprint_id}")

# Load a specific blueprint
entry = get_blueprint_entry("text_to_image_flux_1_dev")
path = get_blueprint_asset_path("text_to_image_flux_1_dev", "text_to_image_flux_1_dev.json")

with open(path) as f:
    data = json.load(f)
    subgraph = data["definitions"]["subgraphs"][0]
    print(f"Name: {subgraph['name']}")
    print(f"Inputs: {[i['name'] for i in subgraph['inputs']]}")
    print(f"Outputs: {[o['name'] for o in subgraph['outputs']]}")
```

## Available Blueprints

Categories include:
- **Text to Image**: Flux, Qwen-Image, Chroma, Omnigen2, etc.
- **Image Editing**: Flux.2 Klein, Qwen, Chrono
- **Text to Video**: LTX 2.0, Wan 2.2
- **Image to Video**: Kandinsky5, Wan 2.2
- **ControlNet**: Qwen-Image, Z-Image-Turbo
- **Inpainting/Outpainting**: Flux.1 Fill, OneReward, Qwen-Image

## Contributing

See the main repository for contribution guidelines: https://github.com/Comfy-Org/workflow_templates
