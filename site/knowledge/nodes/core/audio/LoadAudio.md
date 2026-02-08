# LoadAudio

**Category**: audio

**Display Name**: Load Audio

**Also known as**: import audio, open audio, audio file

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LoadAudio/en.md)

The LoadAudio node loads audio files from the input directory and converts them into a format that can be processed by other audio nodes in ComfyUI. It reads audio files and extracts both the waveform data and sample rate, making them available for downstream audio processing tasks.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `audio` | AUDIO | Yes | All supported audio/video files in input directory | The audio file to load from the input directory |

**Note:** The node only accepts audio and video files that are present in ComfyUI's input directory. The file must exist and be accessible for successful loading.

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `AUDIO` | AUDIO | Audio data containing waveform and sample rate information |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 13 template(s)**
