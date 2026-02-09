# WanReferenceVideoApi

**Category**: api node/video/Wan

**Display Name**: Wan Reference to Video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/WanReferenceVideoApi/en.md)

The Wan Reference to Video node uses the visual appearance and voice from one or more input reference videos, along with a text prompt, to generate a new video. It maintains consistency with the characters from the reference material while creating new content based on your description.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `model` | COMBO | Yes | `"wan2.6-r2v"` | The specific AI model to use for video generation. |
| `prompt` | STRING | Yes | - | A description of the elements and visual features for the new video. Supports English and Chinese. Use identifiers like `character1` and `character2` to refer to the characters from the reference videos. |
| `negative_prompt` | STRING | No | - | A description of elements or features to avoid in the generated video. |
| `reference_videos` | AUTOGROW | Yes | - | A list of video inputs used as references for character appearance and voice. You must provide at least one video. Each video can be assigned a name like `character1`, `character2`, or `character3`. |
| `size` | COMBO | Yes | `"720p: 1:1 (960x960)"`<br>`"720p: 16:9 (1280x720)"`<br>`"720p: 9:16 (720x1280)"`<br>`"720p: 4:3 (1088x832)"`<br>`"720p: 3:4 (832x1088)"`<br>`"1080p: 1:1 (1440x1440)"`<br>`"1080p: 16:9 (1920x1080)"`<br>`"1080p: 9:16 (1080x1920)"`<br>`"1080p: 4:3 (1632x1248)"`<br>`"1080p: 3:4 (1248x1632)"` | The resolution and aspect ratio for the output video. |
| `duration` | INT | Yes | 5 to 10 | The length of the generated video in seconds. The value must be a multiple of 5 (default: 5). |
| `seed` | INT | No | 0 to 2147483647 | A random seed value for reproducible results. A value of 0 will generate a random seed. |
| `shot_type` | COMBO | Yes | `"single"`<br>`"multi"` | Specifies whether the generated video is a single continuous shot or contains multiple shots with cuts. |
| `watermark` | BOOLEAN | No | - | When enabled, an AI-generated watermark is added to the final video (default: False). |

**Constraints:**
*   Each video provided in `reference_videos` must be between 2 and 30 seconds in duration.
*   The `duration` parameter is limited to specific values (5 or 10 seconds).

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `output` | VIDEO | The newly generated video file. |

**Source**: `comfy_api_nodes/nodes_wan.py`

**Used in 1 template(s)**
