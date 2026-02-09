# KlingSingleImageVideoEffectNode

**Category**: api node/video/Kling

**Display Name**: Kling Video Effects

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/KlingSingleImageVideoEffectNode/en.md)

The Kling Single Image Video Effect Node creates videos with different special effects based on a single reference image. It applies various visual effects and scenes to transform static images into dynamic video content. The node supports different effect scenes, model options, and video durations to achieve the desired visual outcome.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `image` | IMAGE | Yes | - | Reference Image. URL or Base64 encoded string (without data:image prefix). File size cannot exceed 10MB, resolution not less than 300*300px, aspect ratio between 1:2.5 ~ 2.5:1 |
| `effect_scene` | COMBO | Yes | Options from KlingSingleImageEffectsScene | The type of special effect scene to apply to the video generation |
| `model_name` | COMBO | Yes | Options from KlingSingleImageEffectModelName | The specific model to use for generating the video effect |
| `duration` | COMBO | Yes | Options from KlingVideoGenDuration | The length of the generated video |

**Note:** The specific options for `effect_scene`, `model_name`, and `duration` are determined by the available values in their respective enum classes (KlingSingleImageEffectsScene, KlingSingleImageEffectModelName, and KlingVideoGenDuration).

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The generated video with applied effects |
| `video_id` | STRING | The unique identifier for the generated video |
| `duration` | STRING | The duration of the generated video |

**Source**: `comfy_api_nodes/nodes_kling.py`

**Used in 1 template(s)**
