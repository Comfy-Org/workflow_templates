# AudioConcat

**Category**: audio

**Display Name**: Audio Concat

**Also known as**: join audio, combine audio, append audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/AudioConcat/en.md)

The AudioConcat node combines two audio inputs by joining them together. It takes two audio inputs and connects them in the order you specify, either placing the second audio before or after the first audio. The node automatically handles different audio formats by converting mono audio to stereo and matching sample rates between the two inputs.

## Inputs

| Parameter | Data Type | Input Type | Default | Range | Description |
|-----------|-----------|------------|---------|-------|-------------|
| `audio1` | AUDIO | required | - | - | The first audio input to be concatenated |
| `audio2` | AUDIO | required | - | - | The second audio input to be concatenated |
| `direction` | COMBO | required | after | ['after', 'before'] | Whether to append audio2 after or before audio1 |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `AUDIO` | AUDIO | The combined audio containing both input audio files joined together |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 1 template(s)**
