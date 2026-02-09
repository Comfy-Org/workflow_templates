# SaveAnimatedWEBP

**Category**: image/animation

## Description

This node is designed for saving a sequence of images as an animated WEBP file. It handles the aggregation of individual frames into a cohesive animation, applying specified metadata, and optimizing the output based on quality and compression settings.

## Inputs

| Field             | Data Type | Description                                                                         |
|-------------------|-------------|-------------------------------------------------------------------------------------|
| `images`          | `IMAGE`     | A list of images to be saved as frames in the animated WEBP. This parameter is essential for defining the visual content of the animation. |
| `filename_prefix` | `STRING`    | Specifies the base name for the output file, which will be appended with a counter and the '.webp' extension. This parameter is crucial for identifying and organizing the saved files. |
| `fps`             | `FLOAT`     | The frames per second rate for the animation, influencing the playback speed. |
| `lossless`        | `BOOLEAN`   | A boolean indicating whether to use lossless compression, affecting the file size and quality of the animation. |
| `quality`         | `INT`       | A value between 0 and 100 that sets the compression quality level, with higher values resulting in better image quality but larger file sizes. |
| `method`          | COMBO[STRING] | Specifies the compression method to use, which can impact the encoding speed and file size. |

## Outputs

| Field | Data Type | Description                                                                       |
|-------|-------------|-----------------------------------------------------------------------------------|
| `ui`  | N/A         | Provides a UI component displaying the saved animated WEBP images along with their metadata, and indicates whether the animation is enabled. |

**Source**: `comfy_extras/nodes_images.py`

**Used in 5 template(s)**
