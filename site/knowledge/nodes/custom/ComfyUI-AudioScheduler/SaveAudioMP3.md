# SaveAudioMP3

**Category**: audio

**Display Name**: Save Audio (MP3)

**Also known as**: export mp3

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/SaveAudioMP3/en.md)

The SaveAudioMP3 node saves audio data as an MP3 file. It takes audio input and exports it to the specified output directory with customizable filename and quality settings. The node automatically handles file naming and format conversion to create a playable MP3 file.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `audio` | AUDIO | Yes | - | The audio data to be saved as an MP3 file |
| `filename_prefix` | STRING | No | - | The prefix for the output filename (default: "audio/ComfyUI") |
| `quality` | STRING | No | "V0"<br>"128k"<br>"320k" | The audio quality setting for the MP3 file (default: "V0") |
| `prompt` | PROMPT | No | - | Internal prompt data (automatically provided by the system) |
| `extra_pnginfo` | EXTRA_PNGINFO | No | - | Additional PNG information (automatically provided by the system) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| *None* | - | This node does not return any output data, but saves the audio file to the output directory |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 16 template(s)**
