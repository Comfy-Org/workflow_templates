# ControlNetInpaintingAliMamaApply

**Category**: conditioning/controlnet

**Display Name**: positive

**Also known as**: masked controlnet

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ControlNetInpaintingAliMamaApply/en.md)

The ControlNetInpaintingAliMamaApply node applies ControlNet conditioning for inpainting tasks by combining positive and negative conditioning with a control image and mask. It processes the input image and mask to create modified conditioning that guides the generation process, allowing for precise control over which areas of the image are inpainted. The node supports strength adjustment and timing controls to fine-tune the ControlNet's influence during different stages of the generation process.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| positive | Conditioning | — |  |
| negative | Conditioning | — |  |
| control_net | ControlNet | — |  |
| vae | Vae | — |  |
| image | Image | — |  |
| mask | Mask | — |  |
| strength | Float | 1.0 |  |
| start_percent | Float | 0.0 |  |
| end_percent | Float | 1.0 |  |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `positive` | CONDITIONING | The modified positive conditioning with ControlNet applied for inpainting |
| `negative` | CONDITIONING | The modified negative conditioning with ControlNet applied for inpainting |

**Source**: `comfy_extras/nodes_controlnet.py`

**Used in 1 template(s)**
