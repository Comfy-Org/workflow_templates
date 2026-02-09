# ImageToMask

**Category**: mask

**Display Name**: Convert Image to Mask

**Also known as**: extract channel, channel to mask

## Description

The ImageToMask node is designed to convert an image into a mask based on a specified color channel. It allows for the extraction of mask layers corresponding to the red, green, blue, or alpha channels of an image, facilitating operations that require channel-specific masking or processing.

## Inputs

| Parameter   | Data Type | Description                                                                                                          |
|-------------|-------------|----------------------------------------------------------------------------------------------------------------------|
| `image`     | `IMAGE`     | The 'image' parameter represents the input image from which a mask will be generated based on the specified color channel. It plays a crucial role in determining the content and characteristics of the resulting mask. |
| `channel`   | COMBO[STRING] | The 'channel' parameter specifies which color channel (red, green, blue, or alpha) of the input image should be used to generate the mask. This choice directly influences the mask's appearance and which parts of the image are highlighted or masked out. |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `mask`    | `MASK`      | The output 'mask' is a binary or grayscale representation of the specified color channel from the input image, useful for further image processing or masking operations. |

**Source**: `comfy_extras/nodes_mask.py`

**Used in 4 template(s)**
