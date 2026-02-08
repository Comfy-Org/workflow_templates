# CLIPTextEncode

**Category**: conditioning

## Description

`CLIP Text Encode (CLIPTextEncode)` acts as a translator, converting your text descriptions into a format that AI can understand. This helps the AI interpret your input and generate the desired image.

Think of it as communicating with an artist who speaks a different language. The CLIP model, trained on vast image-text pairs, bridges this gap by converting your descriptions into "instructions" that the AI model can follow.

## Inputs

| Parameter | Data Type | Input Method | Default | Range | Description |
|-----------|-----------|--------------|---------|--------|-------------|
| text | STRING | Text Input | Empty | Any text | Enter the description (prompt) for the image you want to create. Supports multi-line input for detailed descriptions. |
| clip | CLIP | Model Selection | None | Loaded CLIP models | Select the CLIP model to use when translating your description into instructions for the AI model. |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| CONDITIONING | CONDITIONING | The processed "instructions" of your description that guide the AI model when generating an image. |

**Source**: `nodes.py`

**Used in 61 template(s)**
