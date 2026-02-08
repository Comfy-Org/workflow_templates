# RecordAudio

**Category**: audio

**Display Name**: Record Audio

**Also known as**: microphone input, audio capture, voice input

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/RecordAudio/en.md)

The RecordAudio node loads audio files that have been recorded or selected through the audio recording interface. It processes the audio file and converts it into a waveform format that can be used by other audio processing nodes in the workflow. The node automatically detects the sample rate and prepares the audio data for further manipulation.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `audio` | AUDIO_RECORD | Yes | N/A | The audio recording input from the audio recording interface |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `AUDIO` | AUDIO | The processed audio data containing waveform and sample rate information |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 4 template(s)**
