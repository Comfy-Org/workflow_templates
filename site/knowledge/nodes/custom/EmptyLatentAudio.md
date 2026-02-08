# EmptyLatentAudio

**Category**: latent/audio

**Display Name**: Empty Latent Audio

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/EmptyLatentAudio/en.md)

The EmptyLatentAudio node creates empty latent tensors for audio processing. It generates a blank audio latent representation with specified duration and batch size, which can be used as input for audio generation or processing workflows. The node calculates the appropriate latent dimensions based on the audio duration and sample rate.

## Inputs

| Parameter | Data Type | Required | Range | Description |
|-----------|-----------|----------|-------|-------------|
| `seconds` | FLOAT | Yes | 1.0 - 1000.0 | The duration of the audio in seconds (default: 47.6) |
| `batch_size` | INT | Yes | 1 - 4096 | The number of latent images in the batch (default: 1) |

## Outputs

| Output Name | Data Type | Description |
|-------------|-----------|-------------|
| `LATENT` | LATENT | Returns an empty latent tensor for audio processing with specified duration and batch size |

**Source**: `comfy_extras/nodes_audio.py`

**Used in 1 template(s)**
